import { describe, expect, it } from "vitest";
import {
  comboCount,
  levelState,
  MAX_LEVEL,
  nextRankLevel,
  RANK_LEVELS,
  totalXp,
  unlockedRankCount,
  xpForLevel,
} from "./progress";

describe("totalXp", () => {
  it.each([
    [0, 0, 0],
    [59, 0, 0],
    [60, 0, 2],
    [119, 0, 2],
    [0, 1, 5],
    [600, 4, 40],
    [-100, -1, 0],
  ])("%d秒・%d問 → %d", (studySeconds, correctCount, expected) => {
    expect(totalXp({ studySeconds, correctCount })).toBe(expected);
  });
});

describe("levelState", () => {
  const at = (correctCount: number) =>
    levelState({ studySeconds: 0, correctCount });

  it("記録がなければレベル1", () => {
    expect(at(0)).toEqual({ level: 1, current: 0, needed: 50 });
  });

  it("境界ちょうどで上がる", () => {
    expect(at(9)).toEqual({ level: 1, current: 45, needed: 50 });
    expect(at(10)).toEqual({ level: 2, current: 0, needed: 100 });
    expect(at(29).level).toBe(2);
    expect(at(30)).toEqual({ level: 3, current: 0, needed: 150 });
  });

  it("必要な経験値は、レベルごとに増える", () => {
    for (let level = 1; level < MAX_LEVEL; level++) {
      const step = xpForLevel(level + 1) - xpForLevel(level);
      expect(step).toBe(50 * level);
    }
  });

  it("最大レベルで止まる", () => {
    expect(at(10_000_000)).toEqual({ level: MAX_LEVEL, current: 0, needed: 0 });
  });

  it("経験値が増えて、レベルが下がることはない", () => {
    let previous = 1;
    for (let count = 0; count < 3000; count++) {
      const { level, current, needed } = at(count);
      expect(level).toBeGreaterThanOrEqual(previous);
      expect(current).toBeLessThan(needed);
      previous = level;
    }
  });
});

describe("称号", () => {
  it.each([
    [1, 1, 3],
    [2, 1, 3],
    [3, 2, 6],
    [9, 3, 10],
    [10, 4, 15],
    [15, 5, null],
    [99, 5, null],
  ])("レベル%d：%d個、次は%s", (level, count, next) => {
    expect(unlockedRankCount(level)).toBe(count);
    expect(nextRankLevel(level)).toBe(next);
  });

  it("レベル1から始まり、昇順に並ぶ", () => {
    expect(RANK_LEVELS[0]).toBe(1);
    expect([...RANK_LEVELS].sort((a, b) => a - b)).toEqual([...RANK_LEVELS]);
  });
});

describe("comboCount", () => {
  it.each([
    [[], 0],
    [[true], 1],
    [[false], 0],
    [[true, true, true], 3],
    [[true, false, true, true], 2],
    [[true, true, false], 0],
  ])("%j → %d", (results, expected) => {
    expect(comboCount(results)).toBe(expected);
  });
});
