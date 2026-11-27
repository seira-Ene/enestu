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
    { wave: "sine", gain: 0.5, score: "C4/2 r/2 | E4+G4/4" },
    { wave: "noise", gain: 0.2, score: "x/4 | r/2 x/2" },
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
  it("和音は1つの音と同じくらいの大きさにし、少し短く切る", () => {
    const [, , chord] = eventsBetween(song, 0, 8);
    if (chord === undefined) throw new Error("和音がない");
    const tones = eventTones(song, chord);
    expect(tones).toHaveLength(2);
    expect(tones[0]?.gain).toBeCloseTo(0.5 / Math.SQRT2);
    expect(tones[0]?.duration).toBeCloseTo(4 * 0.25 * 0.9);
  });

  it("打楽器は短い音にする", () => {
    const [, hit] = eventsBetween(song, 0, 8);
    if (hit === undefined) throw new Error("打楽器がない");
    expect(eventTones(song, hit)).toEqual([
      { wave: "noise", from: 0, start: 0, duration: 0.06, gain: 0.2 },
    ]);
  });
});

describe.each(WORLD_IDS)("%s のBGM", (id) => {
  const { bgm } = themes[id];

  it("8小節で、どのパートもちょうど一周する", () => {
    expect(bgm.bars).toBe(8);
    for (const track of bgm.tracks) {
      const total = parseScore(track.score).reduce((sum, note) => sum + note.steps, 0);
      expect(total).toBe(songSteps(bgm));
    }
  });

  it("テンポ・音の高さ・大きさが、聞きやすい範囲にある", () => {
    expect(bgm.tempo).toBeGreaterThanOrEqual(60);
    expect(bgm.tempo).toBeLessThanOrEqual(140);
    for (const track of bgm.tracks) {
      expect(track.gain).toBeGreaterThan(0);
      expect(track.gain).toBeLessThanOrEqual(0.5);
      for (const note of parseScore(track.score)) {
        expect(note.midis.length).toBeLessThanOrEqual(4);
        for (const midi of note.midis) {
          expect(midi).toBeGreaterThanOrEqual(36);
          expect(midi).toBeLessThanOrEqual(96);
        }
      }
    }
    // 一周が、20秒から30秒ほど。
    const seconds = songSteps(bgm) * stepSeconds(bgm);
    expect(seconds).toBeGreaterThanOrEqual(15);
    expect(seconds).toBeLessThanOrEqual(30);
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
