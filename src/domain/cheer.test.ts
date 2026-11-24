import { describe, expect, it } from "vitest";
import type { QuizCheers, ThemeCheers } from "@/themes/types";
import { selectCheers, selectQuizCheer } from "./cheer";

const cheers: ThemeCheers = {
  welcome: ["ようこそA", "ようこそB"],
  timerStart: ["開始"],
  timerStop: ["停止"],
  dailyTotal: ["{minutes}分。{minutes}分！"],
};

describe("selectCheers", () => {
  it("状態に応じたセリフを返す", () => {
    const context = { seed: 0, totalSeconds: 600 };
    expect(selectCheers(cheers, "idle", context)).toEqual(["ようこそA"]);
    expect(selectCheers(cheers, "running", context)).toEqual(["開始"]);
    expect(selectCheers(cheers, "saved", context)).toEqual([
      "停止",
      "10分。10分！",
    ]);
  });

  it.each([
    [0, "ようこそA"],
    [1, "ようこそB"],
    [2, "ようこそA"],
    [-1, "ようこそB"],
    [Number.NaN, "ようこそA"],
  ])("seed %s のセリフは %s", (seed, expected) => {
    expect(selectCheers(cheers, "idle", { seed, totalSeconds: 0 })).toEqual([
      expected,
    ]);
  });

  it.each([null, 0, 59])("合計が%s秒なら、合計のセリフは言わない", (total) => {
    expect(
      selectCheers(cheers, "saved", { seed: 0, totalSeconds: total }),
    ).toEqual(["停止"]);
  });

  it("合計の分数は切り捨てる", () => {
    expect(
      selectCheers(cheers, "saved", { seed: 0, totalSeconds: 119 })[1],
    ).toBe("1分。1分！");
  });
});

describe("selectQuizCheer", () => {
  const quizCheers: QuizCheers = {
    setup: ["準備A", "準備B"],
    start: ["開始"],
    correct: ["正解"],
    incorrect: ["不正解"],
    perfect: ["全問正解"],
    good: ["あと少し"],
    retry: ["もう一度"],
  };

  it.each([
    ["start", "開始"],
    ["correct", "正解"],
    ["incorrect", "不正解"],
    ["perfect", "全問正解"],
    ["good", "あと少し"],
    ["retry", "もう一度"],
  ] as const)("%s のセリフは %s", (moment, expected) => {
    expect(selectQuizCheer(quizCheers, moment, 3)).toBe(expected);
  });

  it("seedでセリフが変わる", () => {
    expect(selectQuizCheer(quizCheers, "setup", 0)).toBe("準備A");
    expect(selectQuizCheer(quizCheers, "setup", 1)).toBe("準備B");
  });
});
