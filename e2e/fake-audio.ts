import type { Page } from "@playwright/test";
import type { Tone } from "../src/domain/tone";

/**
 * 鳴らした音。偽物の音の出口が記録する。
 * modulated：別の波で高さを揺らされた（ベルの音）。reverb：残響にもつながっていた。
 */
export type Played = {
  wave: string;
  freq: number;
  channel: "se" | "bgm" | "none";
  modulated: boolean;
  reverb: boolean;
};

/**
 * ブラウザの音の出口（AudioContext）を、鳴らした音を記録する偽物に替える。
 * 作られた音量の部品（GainNode）は、作った順に gains と nodes に記録する。
 * 最初の3つは、効果音の音量・BGMの音量・BGMを下げるための音量。
 * 鳴らした音がどちらにつながっていたかは、つながりをたどって調べる。
 */
export async function installFakeAudio(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const log = {
      tones: [] as {
        wave: string;
        freq: number;
        channel: string;
        modulated: boolean;
        reverb: boolean;
      }[],
      gains: [] as { value: number; history: number[] }[],
      nodes: [] as unknown[],
    };
    Object.assign(window, { __sound: log });

    class Param {
      history: number[] = [];
      /** この値を、別の音でゆらされたときに印をつける音の記録。 */
      owner: { modulated: boolean } | null = null;
      constructor(public value = 0) {}
      setValueAtTime(value: number) {
        this.value = value;
        this.history.push(value);
        return this;
      }
      linearRampToValueAtTime(value: number) {
        this.history.push(value);
        return this;
      }
      exponentialRampToValueAtTime(value: number) {
        this.history.push(value);
        return this;
      }
      cancelScheduledValues() {
        return this;
      }
    }

    class NodeStub {
      targets: unknown[] = [];
      connect(target: unknown) {
        this.targets.push(target);
        if (target instanceof Param && target.owner !== null) target.owner.modulated = true;
        return target;
      }
      /** つながりの先に、残響があるか。 */
      reachesReverb(): boolean {
        const seen = new Set<unknown>();
        const queue = [...this.targets];
        while (queue.length > 0) {
          const node = queue.shift();
          if (node === undefined || seen.has(node)) continue;
          seen.add(node);
          if (node instanceof ConvolverStub) return true;
          if (node instanceof NodeStub) queue.push(...node.targets);
        }
        return false;
      }
      /** つながりをたどり、効果音とBGMのどちらの音量に着くかを返す。 */
      channel(): string {
        const seen = new Set<unknown>();
        const queue = [...this.targets];
        while (queue.length > 0) {
          const node = queue.shift();
          if (node === undefined || seen.has(node)) continue;
          seen.add(node);
          if (node === log.nodes[1]) return "bgm";
          if (node === log.nodes[0]) return "se";
          if (node instanceof NodeStub) queue.push(...node.targets);
        }
        return "none";
      }
    }
    class GainStub extends NodeStub {
      gain = new Param(1);
    }
    class OscillatorStub extends NodeStub {
      type = "sine";
      frequency = new Param(0);
      detune = new Param(0);
      start() {
        const record = {
          wave: this.type,
          freq: this.frequency.value,
          channel: this.channel(),
          modulated: false,
          reverb: this.reachesReverb(),
        };
        this.frequency.owner = record;
        log.tones.push(record);
      }
      stop() {}
    }
    class SourceStub extends NodeStub {
      buffer: unknown = null;
      start() {
        log.tones.push({
          wave: "noise",
          freq: 0,
          channel: this.channel(),
          modulated: false,
          reverb: this.reachesReverb(),
        });
      }
      stop() {}
    }
    class FilterStub extends NodeStub {
      type = "lowpass";
      frequency = new Param(350);
      Q = new Param(1);
    }
    class ConvolverStub extends NodeStub {
      buffer: unknown = null;
    }
    class CompressorStub extends NodeStub {
      threshold = new Param(-24);
      ratio = new Param(12);
    }
    class PannerStub extends NodeStub {
      pan = new Param(0);
    }

    class FakeAudioContext {
      state = "running";
      sampleRate = 8000;
      destination = new NodeStub();
      get currentTime() {
        return performance.now() / 1000;
      }
      createGain() {
        const node = new GainStub();
        log.gains.push(node.gain);
        log.nodes.push(node);
        return node;
      }
      createOscillator() {
        return new OscillatorStub();
      }
      createBufferSource() {
        return new SourceStub();
      }
      createBiquadFilter() {
        return new FilterStub();
      }
      createConvolver() {
        return new ConvolverStub();
      }
      createDynamicsCompressor() {
        return new CompressorStub();
      }
      createStereoPanner() {
        return new PannerStub();
      }
      createBuffer(_channels: number, length: number) {
        return { getChannelData: () => new Float32Array(length) };
      }
      resume() {
        return Promise.resolve();
      }
    }
    Object.assign(window, { AudioContext: FakeAudioContext });
  });
}

type SoundLog = {
  tones: Played[];
  gains: { value: number; history: number[] }[];
};

const readLog = (page: Page) =>
  page.evaluate(() => (window as unknown as { __sound: SoundLog }).__sound);

export async function played(page: Page): Promise<Played[]> {
  return (await readLog(page)).tones;
}

/** 効果音の全体の音量。 */
export async function seVolume(page: Page): Promise<number | undefined> {
  return (await readLog(page)).gains[0]?.value;
}

/** BGMを下げるための音量が、これまでにとった値。 */
export async function duckHistory(page: Page): Promise<number[]> {
  return (await readLog(page)).gains[2]?.history ?? [];
}

/**
 * その音が鳴ったか。音に含まれる「形と高さ」が、すべて効果音として鳴っていれば鳴ったとみなす。
 * 雑音だけの音は、雑音が鳴った数で見る。
 */
export async function hasPlayed(page: Page, tones: readonly Tone[]): Promise<boolean> {
  const se = (await played(page)).filter((tone) => tone.channel === "se");
  const pitched = tones.filter((tone) => tone.wave !== "noise");
  if (pitched.length === 0) {
    return se.filter((tone) => tone.wave === "noise").length >= tones.length;
  }
  return pitched.every((expected) =>
    se.some(
      (tone) => tone.wave === expected.wave && Math.abs(tone.freq - expected.from) < 0.01,
    ),
  );
}
