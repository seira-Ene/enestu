import { describe, expect, it } from "vitest";
import { themes } from "@/themes";
import { WORLD_IDS } from "@/themes/types";
import {
  eventsBetween,
  eventTones,
  parseNoteName,
  parseScore,
  songSteps,
  stepSeconds,
  stepsPerBar,
  type BgmSong,
} from "./bgm";
import { bell, hat, kick, piano, snare, strings } from "./instruments";

describe("parseNoteName", () => {
  it.each([
    ["A4", 69],
    ["C4", 60],
    ["C#4", 61],
    ["Bb3", 58],
    ["E2", 40],
  ])("%s は %d", (name, midi) => {
    expect(parseNoteName(name)).toBe(midi);
  });

  it.each(["H4", "C", "C#", "Cb"])("読めない音名は断る（%s）", (name) => {
    expect(() => parseNoteName(name)).toThrow();
  });
});

describe("parseScore", () => {
  it("音・和音・休み・打楽器と、小節の区切りを読む", () => {
    expect(parseScore("A4/2 C4+E4/4 |r/1 x/1")).toEqual([
      { midis: [69], isHit: false, steps: 2 },
      { midis: [60, 64], isHit: false, steps: 4 },
      { midis: [], isHit: false, steps: 1 },
      { midis: [], isHit: true, steps: 1 },
    ]);
  });

  it.each(["A4", "A4/0", "A4/1.5", "Q4/2"])("書き方の誤りを見つける（%s）", (score) => {
    expect(() => parseScore(score)).toThrow();
  });
});

const song: BgmSong = {
  tempo: 120,
  beatsPerBar: 2,
  stepsPerBeat: 2,
  bars: 2,
  tracks: [
    { instrument: "piano", gain: 0.5, pan: -0.2, score: "C4/2 r/2 | E4+G4/4" },
    { instrument: "hat", gain: 0.2, pan: 0.4, score: "x/4 | r/2 x/2" },
  ],
};

describe("eventsBetween", () => {
  it("その範囲で鳴り始める音を、順に返す", () => {
    expect(songSteps(song)).toBe(8);
    expect(stepsPerBar(song)).toBe(4);
    expect(stepSeconds(song)).toBe(0.25);
    expect(
      eventsBetween(song, 0, 8).map(({ track, step }) => [track, step]),
    ).toEqual([
      [0, 0],
      [1, 0],
      [0, 4],
      [1, 6],
    ]);
  });

  it("ループの切れ目をまたいでも、続けて返す", () => {
    expect(
      eventsBetween(song, 6, 13).map(({ track, step }) => [track, step]),
    ).toEqual([
      [1, 6],
      [0, 8],
      [1, 8],
      [0, 12],
    ]);
    expect(eventsBetween(song, 1, 4)).toEqual([]);
  });
});

describe("eventTones", () => {
  it("和音は、その楽器の音を重ね、1つの音と同じくらいの大きさにして、少し短く切る", () => {
    const [, , chord] = eventsBetween(song, 0, 8);
    if (chord === undefined) throw new Error("和音がない");
    const each = 0.5 / Math.SQRT2;
    const length = 4 * 0.25 * 0.9;
    expect(eventTones(song, chord)).toEqual([
      ...piano(64, 0, length, each, -0.2),
      ...piano(67, 0, length, each, -0.2),
    ]);
  });

  it("打楽器は、その楽器の音にする", () => {
    const [, hit] = eventsBetween(song, 0, 8);
    if (hit === undefined) throw new Error("打楽器がない");
    expect(eventTones(song, hit)).toEqual(hat(0, 0.2, 0.4));
  });

  it("ストリングスは切らずに伸ばし、キックとスネアも鳴らせる", () => {
    const band: BgmSong = {
      tempo: 120,
      beatsPerBar: 2,
      stepsPerBeat: 2,
      bars: 1,
      tracks: [
        { instrument: "strings", gain: 0.3, score: "C3/4" },
        { instrument: "kick", gain: 0.4, score: "x/4" },
        { instrument: "snare", gain: 0.1, score: "x/4" },
        { instrument: "bell", gain: 0.2, pan: 0.5, score: "A5/4" },
      ],
    };
    const [pad, low, mid, high] = eventsBetween(band, 0, 4);
    if (pad === undefined || low === undefined || mid === undefined || high === undefined) {
      throw new Error("音が足りない");
    }
    expect(eventTones(band, pad)).toEqual(strings(48, 0, 1, 0.3, 0));
    expect(eventTones(band, low)).toEqual(kick(0, 0.4));
    expect(eventTones(band, mid)).toEqual(snare(0, 0.1));
    expect(eventTones(band, high)).toEqual(bell(81, 0, 0.9, 0.2, 0.5));
  });
});

const DRUMS = new Set(["kick", "snare", "hat"]);

/** 楽譜を小節ごとに分ける。 */
const barsOf = (score: string) => score.split("|").map((bar) => bar.trim());

describe.each(WORLD_IDS)("%s のBGM", (id) => {
  const { bgm } = themes[id];

  it("16小節で、どのパートも、どの小節もちょうどの長さ", () => {
    expect(bgm.bars).toBe(16);
    for (const track of bgm.tracks) {
      const bars = barsOf(track.score);
      expect(bars).toHaveLength(16);
      for (const bar of bars) {
        const total = parseScore(bar).reduce((sum, note) => sum + note.steps, 0);
        expect(total).toBe(stepsPerBar(bgm));
      }
    }
  });

  it("前半8小節と後半8小節で、メロディと伴奏が変わる", () => {
    const changed = bgm.tracks.filter((track) => {
      const bars = barsOf(track.score);
      return bars.slice(0, 8).join("|") !== bars.slice(8).join("|");
    });
    expect(changed.length).toBeGreaterThanOrEqual(3);
  });

  it("テンポ・音の高さ・大きさが、聞きやすい範囲にある", () => {
    expect(bgm.tempo).toBeGreaterThanOrEqual(60);
    expect(bgm.tempo).toBeLessThanOrEqual(140);
    for (const track of bgm.tracks) {
      expect(track.gain).toBeGreaterThan(0);
      expect(track.gain).toBeLessThanOrEqual(0.5);
      for (const note of parseScore(track.score)) {
        expect(note.midis.length).toBeLessThanOrEqual(4);
        // 打楽器のパートは打つ印と休みだけ、ほかの楽器のパートは音と休みだけで書く。
        expect(note.isHit).toBe(DRUMS.has(track.instrument) && note.isHit);
        if (DRUMS.has(track.instrument)) expect(note.midis).toEqual([]);
        for (const midi of note.midis) {
          expect(midi).toBeGreaterThanOrEqual(36);
          expect(midi).toBeLessThanOrEqual(96);
        }
      }
    }
    // 一周が、40秒から50秒ほど。
    const seconds = songSteps(bgm) * stepSeconds(bgm);
    expect(seconds).toBeGreaterThanOrEqual(36);
    expect(seconds).toBeLessThanOrEqual(52);
  });
});

describe("世界線どうしのBGM", () => {
  it("5曲が、テンポかメロディで互いに違う", () => {
    const signatures = WORLD_IDS.map((id) =>
      JSON.stringify(themes[id].bgm.tracks.map((track) => track.score)),
    );
    expect(new Set(signatures).size).toBe(WORLD_IDS.length);
  });
});
