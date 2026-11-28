/**
 * 1つの音の形。音声ファイルは使わず、この形を Web Audio API がその場で鳴らす。
 * start と duration は秒、gain は 0〜1。
 */

/** 音の高さ。MIDIの番号（A4 = 69 = 440Hz）から求める。 */
export function noteFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

export type ToneFilter = {
  readonly type: "lowpass" | "highpass" | "bandpass";
  /** 境目の高さ（Hz）。 */
  readonly frequency: number;
  readonly q?: number;
};

export type Tone = {
  readonly wave: "sine" | "square" | "triangle" | "sawtooth" | "noise";
  /** 鳴り始めの高さ（Hz）。noise では使わない。 */
  readonly from: number;
  /** 鳴り終わりの高さ。なければ変えない。 */
  readonly to?: number;
  readonly start: number;
  readonly duration: number;
  readonly gain: number;
  /** 立ち上がりの秒数。なければ 0.01 秒。 */
  readonly attack?: number;
  /** 高い音や低い音を削って、耳に痛くないようにする。 */
  readonly filter?: ToneFilter;
  /** 少しずらした2つ目の音（セント）。重ねて厚みを出す。 */
  readonly detune?: number;
  /** ベルのような音。ratio 倍の高さの波で、高さを depth 倍だけ揺らす。 */
  readonly fm?: { readonly ratio: number; readonly depth: number };
  /** 左右の位置（-1 が左、1 が右）。 */
  readonly pan?: number;
  /** 残響に送る割合（0〜1）。 */
  readonly reverb?: number;
};

/** 音が鳴り終わるまでの秒数。 */
export function soundLength(tones: readonly Tone[]): number {
  return Math.max(0, ...tones.map((tone) => tone.start + tone.duration));
}

/** 音をまとめて、後ろへずらす。 */
export function shift(tones: readonly Tone[], seconds: number): Tone[] {
  return tones.map((tone) => ({ ...tone, start: tone.start + seconds }));
}
