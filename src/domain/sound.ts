/**
 * 効果音とBGMの、音を鳴らす装置に依らない部分。
 * 音声ファイルは使わず、ここに書いた形の音を Web Audio API がその場で作る。
 */

/** 音の高さ。MIDIの番号（A4 = 69 = 440Hz）から求める。 */
export function noteFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** 1つの音。start と duration は秒、gain は 0〜1。 */
export type Tone = {
  readonly wave: "sine" | "square" | "triangle" | "sawtooth" | "noise";
  /** 鳴り始めの高さ（Hz）。noise では使わない。 */
  readonly from: number;
  /** 鳴り終わりの高さ。なければ変えない。 */
  readonly to?: number;
  readonly start: number;
  readonly duration: number;
  readonly gain: number;
};

export const SOUND_NAMES = [
  "click",
  "tap",
  "burst",
  "start",
  "save",
  "correct",
  "incorrect",
  "claim",
  "orb",
  "flip",
  "rare",
  "fanfare",
] as const;
export type SoundName = (typeof SOUND_NAMES)[number];

const n = noteFrequency;

/** 1つの高さを、順に短く鳴らす。 */
function notes(
  wave: Tone["wave"],
  midis: readonly number[],
  step: number,
  duration: number,
  gain: number,
): Tone[] {
  return midis.map((midi, index) => ({
    wave,
    from: n(midi),
    start: index * step,
    duration,
    gain,
  }));
}

/** 効果音。どれも1秒以内にする。 */
export const SOUND_EFFECTS: Readonly<Record<SoundName, readonly Tone[]>> = {
  // ボタンを押したときの、ごく小さな音。
  click: [{ wave: "sine", from: n(84), to: n(79), start: 0, duration: 0.05, gain: 0.25 }],
  // キャラクターをタップ／連打。
  tap: [{ wave: "triangle", from: n(76), to: n(81), start: 0, duration: 0.12, gain: 0.5 }],
  burst: notes("square", [84, 88, 91], 0.05, 0.08, 0.25),
  // タイマー開始（上がる2音）と記録（やわらかい和音）。
  start: notes("triangle", [72, 79], 0.09, 0.14, 0.5),
  save: [60, 64, 67].map((midi) => ({
    wave: "sine",
    from: n(midi),
    start: 0,
    duration: 0.5,
    gain: 0.3,
  })),
  // テストの正解（明るく上がる）と不正解（低く下がる）。
  correct: notes("triangle", [76, 84], 0.08, 0.16, 0.55),
  incorrect: [{ wave: "sawtooth", from: n(52), to: n(45), start: 0, duration: 0.35, gain: 0.3 }],
  // ログインボーナスやミッションの受け取り。
  claim: notes("sine", [84, 88, 91], 0.07, 0.25, 0.4),
  // ガチャ：光がたまる・カードがめくれる・SR以上・UR以上。
  orb: [{ wave: "sine", from: n(60), to: n(84), start: 0, duration: 0.9, gain: 0.35 }],
  flip: [{ wave: "noise", from: 0, start: 0, duration: 0.07, gain: 0.25 }],
  rare: notes("sine", [91, 96], 0.1, 0.4, 0.35),
  fanfare: [
    ...notes("square", [72, 76, 79], 0.1, 0.12, 0.3),
    ...[72, 76, 79, 84].map((midi) => ({
      wave: "triangle" as const,
      from: n(midi),
      start: 0.32,
      duration: 0.6,
      gain: 0.3,
    })),
  ],
};

/** 効果音が鳴り終わるまでの秒数。 */
export function soundLength(tones: readonly Tone[]): number {
  return Math.max(0, ...tones.map((tone) => tone.start + tone.duration));
}

export const VOLUME_LEVELS = ["low", "mid", "high"] as const;
export type VolumeLevel = (typeof VOLUME_LEVELS)[number];

export const VOLUME_LABELS: Readonly<Record<VolumeLevel, string>> = {
  low: "小",
  mid: "中",
  high: "大",
};

/** 全体の音量にかける倍率。BGMは効果音より控えめにする。 */
export const VOLUME_GAINS: Readonly<
  Record<"se" | "bgm", Readonly<Record<VolumeLevel, number>>>
> = {
  se: { low: 0.12, mid: 0.3, high: 0.6 },
  bgm: { low: 0.04, mid: 0.1, high: 0.2 },
};

export type ChannelSetting = { readonly isOn: boolean; readonly level: VolumeLevel };
export type SoundSettings = {
  readonly se: ChannelSetting;
  readonly bgm: ChannelSetting;
};

/** 最初は、効果音だけを鳴らす。いきなり音楽が流れないように、BGMは消しておく。 */
export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  se: { isOn: true, level: "mid" },
  bgm: { isOn: false, level: "mid" },
};

/** 保存しておいた設定を読む。壊れていれば、その部分だけ初期値にする。 */
export function parseSoundSettings(value: unknown): SoundSettings {
  if (typeof value !== "object" || value === null) return DEFAULT_SOUND_SETTINGS;
  const { se, bgm }: Partial<Record<"se" | "bgm", unknown>> = value;
  return {
    se: parseChannel(se, DEFAULT_SOUND_SETTINGS.se),
    bgm: parseChannel(bgm, DEFAULT_SOUND_SETTINGS.bgm),
  };
}

function parseChannel(value: unknown, fallback: ChannelSetting): ChannelSetting {
  if (typeof value !== "object" || value === null) return fallback;
  const { isOn, level }: Partial<Record<keyof ChannelSetting, unknown>> = value;
  return {
    isOn: typeof isOn === "boolean" ? isOn : fallback.isOn,
    level: VOLUME_LEVELS.find((item) => item === level) ?? fallback.level,
  };
}

/** その設定で鳴らすときの音量。消していれば0。 */
export function channelGain(kind: "se" | "bgm", setting: ChannelSetting): number {
  return setting.isOn ? VOLUME_GAINS[kind][setting.level] : 0;
}
