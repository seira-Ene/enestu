import type { Tone } from "@/domain/tone";

/**
 * Web Audio API で音を作って鳴らす。ブラウザでだけ呼ぶこと。
 * 音を出せない環境や、まだ画面が押されていない間は、何もしない。
 *
 * つなぎ方：
 *   音 →（フィルター）→ 音量の変化 →（左右）→ 効果音／BGMの音量 → 全体のならし → スピーカー
 *                         └→ 残響へ送る量 → 残響 → 効果音／BGMの音量
 *   BGMは、効果音の間だけ少し下げる（ダッキング）。
 */

type Channel = "se" | "bgm";

type Engine = {
  readonly context: AudioContext;
  readonly master: Readonly<Record<Channel, GainNode>>;
  /** BGMを一時的に下げるための音量。 */
  readonly duck: GainNode;
  readonly reverb: Readonly<Record<Channel, GainNode>>;
  readonly noise: AudioBuffer;
};

let engine: Engine | null = null;
/** 音を出せる状態になる前に決まった音量。作ったときに使う。 */
const pendingGains: Record<Channel, number> = { se: 0, bgm: 0 };
/** ガチャの演出の間など、BGMを下げ続けているか。 */
let isDuckHeld = false;

/** 効果音の間、BGMをこの倍率まで下げる。 */
export const DUCK_LEVEL = 0.4;

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
    // 効果音とBGMの音量を、最初に作る（作る順は、テストの偽物が頼りにしている）。
    const se = createGain(context, pendingGains.se);
    const bgm = createGain(context, pendingGains.bgm);
    const duck = createGain(context, isDuckHeld ? DUCK_LEVEL : 1);
    const output = createOutput(context);
    se.connect(output);
    bgm.connect(duck);
    duck.connect(output);
    const impulse = createImpulse(context);
    engine = {
      context,
      master: { se, bgm },
      duck,
      reverb: { se: createReverb(context, impulse, se), bgm: createReverb(context, impulse, bgm) },
      noise: createNoise(context),
    };
  } catch {
    engine = null;
  }
}

function createGain(context: AudioContext, gain: number): GainNode {
  const node = context.createGain();
  node.gain.value = gain;
  return node;
}

/** 全体の音量をならして、音が割れないようにする。 */
function createOutput(context: AudioContext): AudioNode {
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.ratio.value = 4;
  compressor.connect(context.destination);
  return compressor;
}

/** 残響の入口。残響の音は、その種類（効果音／BGM）の音量を通す。 */
function createReverb(
  context: AudioContext,
  impulse: AudioBuffer,
  destination: AudioNode,
): GainNode {
  const input = context.createGain();
  const convolver = context.createConvolver();
  convolver.buffer = impulse;
  input.connect(convolver);
  convolver.connect(destination);
  return input;
}

/** 残響のもと。だんだん小さくなる、1.2秒の左右の雑音。 */
function createImpulse(context: AudioContext): AudioBuffer {
  const length = Math.floor(context.sampleRate * 1.2);
  const buffer = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / length) ** 3;
    }
  }
  return buffer;
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

/** 効果音の間だけ、BGMを少し下げて、seconds 秒かけて戻す。 */
export function duckBgm(seconds: number): void {
  if (engine === null || isDuckHeld) return;
  try {
    const { gain } = engine.duck;
    const now = engine.context.currentTime;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(DUCK_LEVEL, now + 0.05);
    gain.linearRampToValueAtTime(1, now + 0.05 + seconds + 0.3);
  } catch {
    // 下げられなくても、画面の動きは止めない。
  }
}

/** ガチャの演出の間など、BGMを下げ続ける。false で戻す。 */
export function holdBgmDuck(isHeld: boolean): void {
  isDuckHeld = isHeld;
  if (engine === null) return;
  try {
    const { gain } = engine.duck;
    const now = engine.context.currentTime;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(isHeld ? DUCK_LEVEL : 1, now + 0.3);
  } catch {
    // 下げられなくても、画面の動きは止めない。
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
  for (const tone of tones) {
    try {
      playTone(engine, tone, channel, at + tone.start);
    } catch {
      // 1つの音が鳴らなくても、ほかの音と画面の動きは止めない。
    }
  }
}

function playTone(current: Engine, tone: Tone, channel: Channel, start: number): void {
  const { context } = current;
  const end = start + tone.duration;
  const attack = Math.min(tone.attack ?? 0.01, tone.duration / 2);

  const envelope = context.createGain();
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.linearRampToValueAtTime(tone.gain, start + attack);
  envelope.gain.exponentialRampToValueAtTime(0.0001, end);

  // 左右に振れない古いブラウザでは、まん中で鳴らす。
  const panner =
    tone.pan !== undefined && tone.pan !== 0 && typeof context.createStereoPanner === "function"
      ? context.createStereoPanner()
      : null;
  if (panner !== null) {
    panner.pan.value = Math.max(-1, Math.min(1, tone.pan ?? 0));
    envelope.connect(panner);
    panner.connect(current.master[channel]);
  } else {
    envelope.connect(current.master[channel]);
  }
  if (tone.reverb !== undefined && tone.reverb > 0) {
    const send = context.createGain();
    send.gain.value = tone.reverb;
    envelope.connect(send);
    send.connect(current.reverb[channel]);
  }

  let input: AudioNode = envelope;
  if (tone.filter !== undefined) {
    const filter = context.createBiquadFilter();
    filter.type = tone.filter.type;
    filter.frequency.value = tone.filter.frequency;
    if (tone.filter.q !== undefined) filter.Q.value = tone.filter.q;
    filter.connect(envelope);
    input = filter;
  }

  if (tone.wave === "noise") {
    const source = context.createBufferSource();
    source.buffer = current.noise;
    source.connect(input);
    source.start(start);
    source.stop(end);
    return;
  }

  const oscillators = [startOscillator(context, tone, input, start, end, 0)];
  // 少しずらした音を重ねて、厚みを出す。
  if (tone.detune !== undefined && tone.detune !== 0) {
    oscillators.push(startOscillator(context, tone, input, start, end, tone.detune));
  }
  // ベルの音：別の波で、高さを揺らす。
  if (tone.fm !== undefined) {
    const modulator = context.createOscillator();
    modulator.frequency.setValueAtTime(tone.from * tone.fm.ratio, start);
    const depth = context.createGain();
    depth.gain.setValueAtTime(tone.from * tone.fm.depth, start);
    depth.gain.exponentialRampToValueAtTime(Math.max(1, tone.from * 0.05), end);
    modulator.connect(depth);
    for (const oscillator of oscillators) depth.connect(oscillator.frequency);
    modulator.start(start);
    modulator.stop(end + 0.02);
  }
}

function startOscillator(
  context: AudioContext,
  tone: Tone,
  destination: AudioNode,
  start: number,
  end: number,
  detune: number,
): OscillatorNode {
  const oscillator = context.createOscillator();
  oscillator.type = tone.wave === "noise" ? "sine" : tone.wave;
  oscillator.frequency.setValueAtTime(tone.from, start);
  if (tone.to !== undefined) oscillator.frequency.exponentialRampToValueAtTime(tone.to, end);
  if (detune !== 0) oscillator.detune.value = detune;
  oscillator.connect(destination);
  oscillator.start(start);
  oscillator.stop(end + 0.02);
  return oscillator;
}
