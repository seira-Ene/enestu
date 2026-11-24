import { describe, expect, it } from "vitest";
import {
  accuracy,
  attachToday,
  statsSince,
  studyShare,
  topMistakeReason,
  toPercent,
  unclassifiedCount,
  type SubjectCounts,
} from "./subject-stats";

function counts(overrides: Partial<SubjectCounts> = {}): SubjectCounts {
  return {
    subject: "数学",
    studySeconds: 0,
    answerCount: 0,
    correctCount: 0,
    reasons: { knowledge: 0, understanding: 0, careless: 0 },
    ...overrides,
  };
}

describe("statsSince", () => {
  it("今日を含む30日前の、日本時間0時を返す", () => {
    // 日本時間 11/24 12:00 → 10/26 0:00
    expect(statsSince(new Date("2026-11-24T03:00:00Z")).toISOString()).toBe(
      "2026-10-25T15:00:00.000Z",
    );
  });
});

describe("attachToday", () => {
  it("科目名で今日の分を結び付け、なければ0にする", () => {
    const recent = [
      counts({ subject: "数学", studySeconds: 600, answerCount: 9 }),
      counts({ subject: "英語", studySeconds: 300 }),
    ];
    const today = [
      counts({ subject: "数学", studySeconds: 60, answerCount: 2 }),
    ];
    const result = attachToday(recent, today);
    expect(result[0]).toMatchObject({
      studySeconds: 600,
      todayStudySeconds: 60,
      todayAnswerCount: 2,
    });
    expect(result[1]).toMatchObject({
      todayStudySeconds: 0,
      todayAnswerCount: 0,
    });
  });
});

describe("accuracy", () => {
  it("正解数を解答数で割る。未解答は null", () => {
    expect(accuracy(counts())).toBeNull();
    expect(accuracy(counts({ answerCount: 4, correctCount: 3 }))).toBe(0.75);
    expect(accuracy(counts({ answerCount: 4, correctCount: 0 }))).toBe(0);
  });
});

describe("studyShare", () => {
  it("全体に占める割合。全体が0秒なら null", () => {
    const math = counts({ studySeconds: 300 });
    const english = counts({ subject: "英語", studySeconds: 900 });
    expect(studyShare(math, [math, english])).toBe(0.25);
    expect(studyShare(counts(), [counts()])).toBeNull();
  });
});

describe("unclassifiedCount", () => {
  it("誤答から、原因を選んだ数を引く", () => {
    const stats = counts({
      answerCount: 10,
      correctCount: 4,
      reasons: { knowledge: 2, understanding: 1, careless: 1 },
    });
    expect(unclassifiedCount(stats)).toBe(2);
    expect(unclassifiedCount(counts())).toBe(0);
  });
});

describe("topMistakeReason", () => {
  it.each([
    [{ knowledge: 0, understanding: 0, careless: 0 }, null],
    [{ knowledge: 1, understanding: 3, careless: 2 }, "understanding"],
    [{ knowledge: 0, understanding: 0, careless: 1 }, "careless"],
    [{ knowledge: 2, understanding: 2, careless: 2 }, "knowledge"],
  ])("%j → %s", (reasons, expected) => {
    expect(topMistakeReason(counts({ reasons }))).toBe(expected);
  });
});

describe("toPercent", () => {
  it.each([
    [0, 0],
    [0.666, 66],
    [0.999, 99],
    [1, 100],
    [1.5, 100],
    [-1, 0],
  ])("%d → %d", (ratio, expected) => {
    expect(toPercent(ratio)).toBe(expected);
  });
});
