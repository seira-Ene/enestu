import { noteFrequency, type Tone } from "./tone";

/**
 * 楽器の音色。どれも「高さ・始まり・長さ・大きさ」から、音の形（Tone）を作る。
 * 効果音とBGMの両方で使う。
 */

const n = noteFrequency;

export type Voice = (midi: number, start: number, duration: number, gain: number, pan?: number) => Tone[];

/** ピアノ風。すぐ減る明るい音に、1オクターブ上を少し重ねる。 */
export const piano: Voice = (midi, start, duration, gain, pan = 0) => [
  {
    wave: "triangle",
    from: n(midi),
    start,
    duration,
    gain,
    attack: 0.005,
    filter: { type: "lowpass", frequency: Math.min(8000, n(midi) * 6) },
    reverb: 0.2,
    pan,
  },
  {
    wave: "sine",
    from: n(midi) * 2,
    start,
    duration: duration * 0.6,
    gain: gain * 0.25,
    attack: 0.005,
    pan,
  },
];

/** ストリングス風。ゆっくり立ち上がる、やわらかい音。 */
export const strings: Voice = (midi, start, duration, gain, pan = 0) => [
  {
    wave: "sawtooth",
    from: n(midi),
    start,
    duration,
    gain,
    attack: Math.min(0.3, duration / 3),
    filter: { type: "lowpass", frequency: 1800 },
    detune: 8,
    reverb: 0.35,
    pan,
  },
];

/** ベル風。2つの波を掛け合わせた、きらきらした音。 */
export const bell: Voice = (midi, start, duration, gain, pan = 0) => [
  {
    wave: "sine",
    from: n(midi),
    start,
    duration,
    gain,
    attack: 0.002,
    fm: { ratio: 3.5, depth: 1.5 },
    reverb: 0.3,
    pan,
  },
];

/** ベース。低い音だけを残す。 */
export const bass: Voice = (midi, start, duration, gain, pan = 0) => [
  {
    wave: "triangle",
    from: n(midi),
    start,
    duration,
    gain,
    attack: 0.01,
    filter: { type: "lowpass", frequency: 600 },
    pan,
  },
];

/** ギター風。はじいた音。 */
export const pluck: Voice = (midi, start, duration, gain, pan = 0) => [
  {
    wave: "sawtooth",
    from: n(midi),
    start,
    duration,
    gain,
    attack: 0.002,
    filter: { type: "lowpass", frequency: Math.min(6000, n(midi) * 4) },
    detune: 4,
    reverb: 0.15,
    pan,
  },
];

/** 金管風。少し遅れて立ち上がる、張りのある音。 */
export const brass: Voice = (midi, start, duration, gain, pan = 0) => [
  {
    wave: "sawtooth",
    from: n(midi),
    start,
    duration,
    gain,
    attack: 0.04,
    filter: { type: "lowpass", frequency: 2200 },
    detune: 6,
    reverb: 0.25,
    pan,
  },
];

/** キック。高さを急に下げた低い音。 */
export function kick(start: number, gain: number): Tone[] {
  return [{ wave: "sine", from: 150, to: 45, start, duration: 0.2, gain, attack: 0.002 }];
}

/** スネア。中くらいの高さの雑音に、短い音を重ねる。 */
export function snare(start: number, gain: number): Tone[] {
  return [
    {
      wave: "noise",
      from: 0,
      start,
      duration: 0.12,
      gain,
      attack: 0.002,
      filter: { type: "bandpass", frequency: 1800, q: 0.8 },
      reverb: 0.1,
    },
    { wave: "triangle", from: 190, to: 150, start, duration: 0.08, gain: gain * 0.5, attack: 0.002 },
  ];
}

/** ハイハット。高い雑音だけを短く。 */
export function hat(start: number, gain: number, pan = 0.2): Tone[] {
  return [
    {
      wave: "noise",
      from: 0,
      start,
      duration: 0.05,
      gain,
      attack: 0.001,
      filter: { type: "highpass", frequency: 7000 },
      pan,
    },
  ];
}

/** 雑音を、決まった高さのあたりだけ残して、短く鳴らす。紙やたき火の音に使う。 */
export function noiseBurst(
  start: number,
  duration: number,
  gain: number,
  frequency: number,
  pan = 0,
): Tone[] {
  return [
    {
      wave: "noise",
      from: 0,
      start,
      duration,
      gain,
      attack: 0.002,
      filter: { type: "bandpass", frequency, q: 1.2 },
      pan,
    },
  ];
}
