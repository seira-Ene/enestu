import { noteFrequency, type Tone } from "./sound";

/**
 * BGMの曲。世界線ごとのオリジナル曲を、楽譜にあたる文字列で書く。
 *
 * score の書き方（空白区切り。「|」は小節の区切りで、読み飛ばす）：
 * - 「A4/2」：A4 の音を2つ分の長さ。# と b も使える（C#5、Bb3）。
 * - 「A3+C4+E4/8」：和音。
 * - 「r/2」：休み。
 * - 「x/1」：打楽器を1回たたく（wave が noise か kick のパート）。
 */

export type BgmTrack = {
  readonly wave: "sine" | "square" | "triangle" | "sawtooth" | "noise" | "kick";
  /** 0〜1。BGM全体の音量とは別に、パートどうしの大きさを決める。 */
  readonly gain: number;
  readonly score: string;
};

export type BgmSong = {
  /** 1分あたりの拍の数。 */
  readonly tempo: number;
  readonly beatsPerBar: number;
  /** 1拍を、いくつに分けて書くか。2なら8分音符が1つ分。 */
  readonly stepsPerBeat: number;
  readonly bars: number;
  readonly tracks: readonly BgmTrack[];
};

/** 楽譜の1つの音。midis が空なら休みか、打楽器の1打。 */
export type BgmNote = {
  readonly midis: readonly number[];
  readonly isHit: boolean;
  readonly steps: number;
};

const PITCH_CLASSES: Readonly<Record<string, number>> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/** 「C#4」のような音名を、MIDIの番号にする。 */
export function parseNoteName(name: string): number {
  const match = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  const base = match === null ? undefined : PITCH_CLASSES[match[1] ?? ""];
  if (match === null || base === undefined) {
    throw new Error(`音名を読めません: ${name}`);
  }
  const accidental = match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0;
  return 12 * (Number(match[3]) + 1) + base + accidental;
}

export function parseScore(score: string): BgmNote[] {
  return score
    .replaceAll("|", " ")
    .split(/\s+/)
    .filter((token) => token !== "")
    .map((token) => {
      const [body = "", length = ""] = token.split("/");
      const steps = Number(length);
      if (!Number.isInteger(steps) || steps <= 0) {
        throw new Error(`長さを読めません: ${token}`);
      }
      if (body === "r") return { midis: [], isHit: false, steps };
      if (body === "x") return { midis: [], isHit: true, steps };
      return { midis: body.split("+").map(parseNoteName), isHit: false, steps };
    });
}

export function stepsPerBar(song: BgmSong): number {
  return song.beatsPerBar * song.stepsPerBeat;
}

/** 曲が一周するまでの区切りの数。 */
export function songSteps(song: BgmSong): number {
  return song.bars * stepsPerBar(song);
}

/** 1つの区切りの秒数。 */
export function stepSeconds(song: BgmSong): number {
  return 60 / song.tempo / song.stepsPerBeat;
}

/** パートごとに、何番目の区切りで鳴り始めるかを添えた音。 */
type TimedNote = BgmNote & { readonly step: number };

const timedCache = new WeakMap<BgmSong, readonly (readonly TimedNote[])[]>();

function timedTracks(song: BgmSong): readonly (readonly TimedNote[])[] {
  const cached = timedCache.get(song);
  if (cached !== undefined) return cached;
  const timed = song.tracks.map((track) => {
    let step = 0;
    return parseScore(track.score).map((note) => {
      const at = step;
      step += note.steps;
      return { ...note, step: at };
    });
  });
  timedCache.set(song, timed);
  return timed;
}

/** 鳴らす予定の1つの音。step は曲の頭からの通し番号（ループしても増え続ける）。 */
export type BgmEvent = {
  readonly track: number;
  readonly step: number;
  readonly note: BgmNote;
};

/** from 以上 to 未満の区切りで鳴り始める音。ループの切れ目もまたぐ。 */
export function eventsBetween(song: BgmSong, from: number, to: number): BgmEvent[] {
  const length = songSteps(song);
  const events: BgmEvent[] = [];
  const tracks = timedTracks(song);
  for (let loop = Math.floor(from / length); loop * length < to; loop += 1) {
    tracks.forEach((notes, track) => {
      for (const note of notes) {
        const step = loop * length + note.step;
        if (step < from || step >= to) continue;
        if (note.midis.length === 0 && !note.isHit) continue;
        events.push({ track, step, note });
      }
    });
  }
  return events.sort((a, b) => a.step - b.step || a.track - b.track);
}

/** 鳴らす音を、効果音と同じ形にする。start は0（鳴らす時刻は呼ぶ側が決める）。 */
export function eventTones(song: BgmSong, event: BgmEvent): Tone[] {
  const track = song.tracks[event.track];
  if (track === undefined) return [];
  const length = event.note.steps * stepSeconds(song);
  if (track.wave === "kick") {
    return [{ wave: "sine", from: 150, to: 45, start: 0, duration: 0.18, gain: track.gain }];
  }
  if (track.wave === "noise") {
    return [{ wave: "noise", from: 0, start: 0, duration: 0.06, gain: track.gain }];
  }
  const { wave } = track;
  return event.note.midis.map((midi) => ({
    wave,
    from: noteFrequency(midi),
    start: 0,
    // 少し短く切って、音どうしの間に息つぎを作る。
    duration: length * 0.9,
    // 和音は、まとめて1つの音と同じくらいの大きさにする。
    gain: track.gain / Math.sqrt(event.note.midis.length),
  }));
}
