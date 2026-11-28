import type { WorldId } from "@/themes/types";
import {
  bell,
  brass,
  kick,
  noiseBurst,
  piano,
  pluck,
  snare,
  strings,
} from "./instruments";
import { shift, type Tone } from "./tone";

/**
 * 効果音とBGMの、音を鳴らす装置に依らない部分。
 * 音声ファイルは使わず、ここに書いた形の音を Web Audio API がその場で作る。
 */

export { noteFrequency, soundLength, type Tone } from "./tone";

export const SOUND_NAMES = [
  "click",
  "tap",
  "burst",
  "start",
  "save",
  "correct",
  "incorrect",
  "claim",
  "mission",
  "levelup",
  "orb",
  "flip",
  "rare",
  "fanfare",
] as const;
export type SoundName = (typeof SOUND_NAMES)[number];

/** 高さを順に、step 秒ずつずらして鳴らす。 */
function arpeggio(
  voice: (midi: number, start: number, duration: number, gain: number) => Tone[],
  midis: readonly number[],
  step: number,
  duration: number,
  gain: number,
): Tone[] {
  return midis.flatMap((midi, index) => voice(midi, index * step, duration, gain));
}

/** 和音として同時に鳴らす。和音は、まとめて1つの音くらいの大きさにする。 */
function chord(
  voice: (midi: number, start: number, duration: number, gain: number) => Tone[],
  midis: readonly number[],
  start: number,
  duration: number,
  gain: number,
): Tone[] {
  return midis.flatMap((midi) => voice(midi, start, duration, gain / Math.sqrt(midis.length)));
}

/** 効果音。どれも1.5秒以内にする。 */
export const SOUND_EFFECTS: Readonly<Record<SoundName, readonly Tone[]>> = {
  // ボタンを押したときの、ごく小さな音。
  click: [
    {
      wave: "sine",
      from: 1046.5,
      to: 784,
      start: 0,
      duration: 0.05,
      gain: 0.2,
      attack: 0.002,
    },
  ],
  // キャラクターをタップ。世界線ごとの音（WORLD_TAPS）がないときに使う。
  tap: piano(76, 0, 0.18, 0.4),
  // 何度も続けて押されたとき。高いベルを細かく。
  burst: arpeggio(bell, [88, 91, 96], 0.05, 0.18, 0.22),
  // タイマー開始（上がる2音）と記録（やわらかい和音）。
  start: arpeggio(piano, [72, 79], 0.09, 0.25, 0.45),
  save: chord(strings, [60, 64, 67], 0, 0.7, 0.4),
  // テストの正解（ベルの和音）と不正解（やわらかく低い音）。
  correct: arpeggio(bell, [76, 84], 0.08, 0.45, 0.4),
  incorrect: [
    {
      wave: "triangle",
      from: 164.8,
      to: 110,
      start: 0,
      duration: 0.35,
      gain: 0.32,
      attack: 0.01,
      filter: { type: "lowpass", frequency: 800 },
    },
  ],
  // ログインボーナスの受け取り。コインのきらめき。
  claim: [...arpeggio(bell, [88, 93], 0.06, 0.3, 0.3), ...bell(100, 0.12, 0.25, 0.15)],
  // ミッション達成。上がる分散和音に、ベルを添える。
  mission: [...arpeggio(piano, [72, 76, 79, 84], 0.07, 0.3, 0.35), ...bell(96, 0.3, 0.4, 0.2)],
  // レベルアップ。金管で上がり、最後をのばす。
  levelup: [
    ...arpeggio(brass, [67, 72, 76], 0.1, 0.18, 0.28),
    ...chord(brass, [67, 72, 76, 79], 0.3, 0.6, 0.36),
    ...bell(91, 0.3, 0.6, 0.15),
  ],
  // ガチャ：光がたまる・カードがめくれる・SR以上・UR以上。
  orb: [
    {
      wave: "sine",
      from: 261.6,
      to: 1046.5,
      start: 0,
      duration: 0.9,
      gain: 0.3,
      attack: 0.3,
      reverb: 0.4,
    },
  ],
  flip: noiseBurst(0, 0.07, 0.25, 4000),
  rare: arpeggio(bell, [91, 96], 0.1, 0.5, 0.32),
  fanfare: [
    // ドラムロール
    ...Array.from({ length: 8 }, (_, index) => snare(index * 0.035, 0.12 + index * 0.012)).flat(),
    ...shift(arpeggio(brass, [72, 76, 79], 0.1, 0.12, 0.3), 0.3),
    ...chord(brass, [72, 76, 79, 84], 0.62, 0.7, 0.42),
    ...kick(0.62, 0.4),
    ...bell(96, 0.62, 0.7, 0.15),
  ],
};

/** 世界線ごとの、キャラクターをタップしたときの音。 */
export const WORLD_TAPS: Readonly<Record<WorldId, readonly Tone[]>> = {
  // たいまつのはぜる音。短い雑音を不規則に重ねる。
  dungeon: [
    ...noiseBurst(0, 0.03, 0.3, 2600, -0.2),
    ...noiseBurst(0.035, 0.025, 0.2, 3400, 0.1),
    ...noiseBurst(0.08, 0.03, 0.25, 2200, 0.25),
    ...noiseBurst(0.13, 0.02, 0.14, 3800, -0.1),
    { wave: "sine", from: 110, to: 80, start: 0, duration: 0.1, gain: 0.18 },
  ],
  // ハープ。下から上へ、なでるように。
  otome: [72, 76, 79, 84, 88].flatMap((midi, index) =>
    pluck(midi, index * 0.04, 0.6, 0.14, -0.4 + index * 0.2).map((tone) => ({
      ...tone,
      wave: "triangle" as const,
      reverb: 0.45,
    })),
  ),
  // ページをめくる音。高さの違う紙の音を2つ。
  detective: [...noiseBurst(0, 0.09, 0.25, 3000, -0.3), ...noiseBurst(0.07, 0.06, 0.18, 5200, 0.3)],
  // ギター。和音を上からかき鳴らす。
  live: [64, 68, 71, 76].flatMap((midi, index) => pluck(midi, index * 0.015, 0.45, 0.16)),
  // カップが触れ合う音。高いベルを2回。
  cafe: [...bell(96, 0, 0.25, 0.18, -0.2), ...bell(100, 0.08, 0.25, 0.14, 0.2)],
};

/** その効果音の音。タップは、世界線ごとの音にする。 */
export function effectTones(name: SoundName, world: WorldId): readonly Tone[] {
  return name === "tap" ? WORLD_TAPS[world] : SOUND_EFFECTS[name];
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
