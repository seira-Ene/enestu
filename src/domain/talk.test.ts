import { describe, expect, it } from "vitest";
import { cafe } from "@/themes/cafe";
import {
  BURST_TAPS,
  BURST_WINDOW_MS,
  burstLinesFor,
  NO_TAPS,
  nextTapState,
  selectTalkLine,
  type TapState,
} from "./talk";

describe("selectTalkLine", () => {
  const lines = ["あ", "い", "う"];

  it.each([
    [0, "あ"],
    [0.5, "い"],
    [0.999, "う"],
  ])("乱数 %d に応じて選ぶ", (random, line) => {
    expect(selectTalkLine(lines, null, () => random)).toBe(line);
  });

  it.each([0, 0.5, 0.999])("直前と同じセリフは続けない（乱数 %d）", (random) => {
    for (const previous of lines) {
      expect(selectTalkLine(lines, previous, () => random)).not.toBe(previous);
    }
  });

  it("1つしかなければ、同じセリフを返す", () => {
    expect(selectTalkLine(["あ"], "あ", () => 0)).toBe("あ");
  });

  it("セリフがなければ null", () => {
    expect(selectTalkLine([], null, () => 0)).toBeNull();
  });
});

describe("nextTapState", () => {
  it("2.5秒以内に5回で、連打とみなす", () => {
    expect([BURST_WINDOW_MS, BURST_TAPS]).toEqual([2500, 5]);
  });

  /** 時刻の並びのとおりに押したときの、最後の状態。 */
  const tapAt = (times: readonly number[], from: TapState = NO_TAPS) =>
    times.reduce(nextTapState, from);
  const every = (gap: number, count: number, start = 0) =>
    Array.from({ length: count }, (_, index) => start + index * gap);

  it(`${BURST_TAPS - 1}回では、連打にならない`, () => {
    expect(tapAt(every(100, BURST_TAPS - 1)).isBurst).toBe(false);
  });

  it(`${BURST_WINDOW_MS}ミリ秒以内に${BURST_TAPS}回で、連打になる`, () => {
    expect(tapAt(every(100, BURST_TAPS)).isBurst).toBe(true);
    // 境目：最初から最後まで、ちょうど BURST_WINDOW_MS。
    const edge = every(BURST_WINDOW_MS / (BURST_TAPS - 1), BURST_TAPS);
    expect(tapAt(edge).isBurst).toBe(true);
    expect(tapAt(edge.map((time, index) => time + index)).isBurst).toBe(false);
  });

  it("間を空けて押した回数は、足し合わせない", () => {
    // 前の回数を数えたまま待っても、その時間の外の分は数えない。
    expect(tapAt(every(700, BURST_TAPS)).isBurst).toBe(false);
    expect(tapAt(every(700, BURST_TAPS * 3)).isBurst).toBe(false);
  });

  it("連打の後は、押し続けるあいだ連打のまま", () => {
    const burst = tapAt(every(100, BURST_TAPS));
    expect(tapAt(every(BURST_WINDOW_MS, 3, 400 + BURST_WINDOW_MS), burst).isBurst).toBe(true);
  });

  it(`${BURST_WINDOW_MS}ミリ秒より空くと、ふつうに戻り、数え直す`, () => {
    const burst = tapAt(every(100, BURST_TAPS));
    const after = nextTapState(burst, 400 + BURST_WINDOW_MS + 1);
    expect(after).toEqual({ taps: [400 + BURST_WINDOW_MS + 1], isBurst: false });
  });

  it("覚えておく時刻は、数えるのに要る分だけ", () => {
    expect(tapAt(every(10, 100)).taps).toHaveLength(BURST_TAPS);
  });
});

describe("burstLinesFor", () => {
  const { burstTalk } = cafe.character;

  it("名前がなければ、ふだんの連打セリフだけ", () => {
    expect(burstLinesFor(cafe.character, null)).toEqual(burstTalk);
  });

  it("名前があれば、名前を呼ぶセリフも混ぜる", () => {
    const lines = burstLinesFor(cafe.character, "そら");
    expect(lines.slice(0, burstTalk.length)).toEqual(burstTalk);
    expect(lines.length).toBeGreaterThan(burstTalk.length);
    for (const line of lines.slice(burstTalk.length)) {
      expect(line).toContain("そら");
    }
  });
});
