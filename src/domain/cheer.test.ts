import { describe, expect, it } from "vitest";
import type { ThemeCheers } from "@/themes/types";
import { selectCheers } from "./cheer";

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
