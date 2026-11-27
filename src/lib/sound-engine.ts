import type { Tone } from "@/domain/sound";

/**
 * Web Audio API で音を作って鳴らす。ブラウザでだけ呼ぶこと。
 * 音を出せない環境や、まだ画面が押されていない間は、何もしない。
 */

type Channel = "se" | "bgm";

type Engine = {
  readonly context: AudioContext;
  readonly master: Readonly<Record<Channel, GainNode>>;
  readonly noise: AudioBuffer;
};

let engine: Engine | null = null;
/** 音を出せる状態になる前に決まった音量。作ったときに使う。 */
const pendingGains: Record<Channel, number> = { se: 0, bgm: 0 };

/**
 * 音を出せる状態にする。ブラウザは、画面が押されるまで音を出させないため、
 * 押されたときに呼ぶ。
 */
export function unlockAudio(): void {
  try {
    if (engine !== null) {
      if (engine.context.state === "suspended") void engine.context.resume();
      return;
    }
    // 音を出せないブラウザでは、ここで例外になり、何もしない。
    const context = new window.AudioContext();
    const master = {
      se: createMaster(context, pendingGains.se),
      bgm: createMaster(context, pendingGains.bgm),
    };
    engine = { context, master, noise: createNoise(context) };
  } catch {
    engine = null;
  }
}

function createMaster(context: AudioContext, gain: number): GainNode {
  const node = context.createGain();
  node.gain.value = gain;
  node.connect(context.destination);
  return node;
}

/** 「シュッ」という音のもとになる、0.2秒の雑音。 */
function createNoise(context: AudioContext): AudioBuffer {
  const length = Math.floor(context.sampleRate * 0.2);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
  return buffer;
}

export function setChannelGain(channel: Channel, gain: number): void {
  pendingGains[channel] = gain;
  if (engine === null) return;
  try {
    const { gain: param } = engine.master[channel];
    param.cancelScheduledValues(engine.context.currentTime);
    param.setValueAtTime(gain, engine.context.currentTime);
  } catch {
    // 音量を変えられなくても、画面の動きは止めない。
  }
}

/** 音の時計の今の時刻（秒）。まだ音を出せなければ null。 */
export function audioNow(): number | null {
  return engine === null ? null : engine.context.currentTime;
}

/** 音を予約して鳴らす。delay は今からの秒数。 */
export function playTones(
  tones: readonly Tone[],
  channel: Channel = "se",
  delay = 0,
): void {
  if (engine === null) return;
  playTonesAt(tones, channel, engine.context.currentTime + delay);
}

/** 音を、音の時計の決まった時刻に鳴らす。BGMは、この形で先回りして予約する。 */
export function playTonesAt(
  tones: readonly Tone[],
  channel: Channel,
  at: number,
): void {
  if (engine === null || pendingGains[channel] === 0) return;
  try {
    const { context, master, noise } = engine;
    const base = at;
    for (const tone of tones) {
      const start = base + tone.start;
      const end = start + tone.duration;
      const envelope = context.createGain();
      envelope.gain.setValueAtTime(0.0001, start);
      envelope.gain.linearRampToValueAtTime(tone.gain, start + 0.01);
      envelope.gain.exponentialRampToValueAtTime(0.0001, end);
      envelope.connect(master[channel]);

      if (tone.wave === "noise") {
        const source = context.createBufferSource();
        source.buffer = noise;
        source.connect(envelope);
        source.start(start);
        source.stop(end);
        continue;
      }
      const oscillator = context.createOscillator();
      oscillator.type = tone.wave;
      oscillator.frequency.setValueAtTime(tone.from, start);
      if (tone.to !== undefined) {
        oscillator.frequency.exponentialRampToValueAtTime(tone.to, end);
      }
      oscillator.connect(envelope);
      oscillator.start(start);
      oscillator.stop(end + 0.02);
    }
  } catch {
    // 音が鳴らなくても、画面の動きは止めない。
  }
}
