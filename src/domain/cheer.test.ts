import { describe, expect, it } from "vitest";
import type { QuestLines, QuizCheers, ThemeCheers } from "@/themes/types";
import { selectCheers, selectQuestLine, selectQuizCheer } from "./cheer";
import type { Quest } from "./weakness";

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

describe("selectQuestLine", () => {
  const lines: QuestLines = {
    weak: "{subject}が苦手。{subject}を解こう",
    neglected: "{subject}が不足",
    starter: "まず解こう",
    clear: "苦手なし",
    achieved: "達成",
  };

  it("種類に応じた文に、科目名を埋め込む", () => {
    const line = (quest: Quest) => selectQuestLine(lines, quest, false);
    expect(line({ kind: "weak", subject: "数学" })).toBe(
      "数学が苦手。数学を解こう",
    );
    expect(line({ kind: "neglected", subject: "$&" })).toBe("$&が不足");
    expect(line({ kind: "starter" })).toBe("まず解こう");
    expect(line({ kind: "clear" })).toBe("苦手なし");
  });

  it("達成したら達成の文にする", () => {
    expect(
      selectQuestLine(lines, { kind: "weak", subject: "数学" }, true),
    ).toBe("達成");
  });
});
