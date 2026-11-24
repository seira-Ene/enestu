import { describe, expect, it } from "vitest";
import { judgeAnswer } from "./answer-judge";

describe("judgeAnswer", () => {
  it.each([
    ["固有値", "固有値"],
    [" 固有値　", "固有値"],
    ["ＴＣＰ", "tcp"],
    ["ｶﾀｶﾅ", "カタカナ"],
    ["new  york", "New York"],
    ["１２３", "123"],
    ["f ( x ) = 1", "f(x)=1"],
    ["ガ", "ガ"],
  ])("%j は %j と同じ", (user, correct) => {
    expect(judgeAnswer(user, correct)).toBe(true);
  });

  it.each([
    ["こゆうち", "固有値"],
    ["固有", "固有値"],
    ["固有値。", "固有値"],
    ["カタカナ", "かたかな"],
    ["-1", "1"],
  ])("%j は %j と違う", (user, correct) => {
    expect(judgeAnswer(user, correct)).toBe(false);
  });

  it.each(["", " ", "　\n"])("空の解答 %j は不正解", (user) => {
    expect(judgeAnswer(user, "答え")).toBe(false);
    expect(judgeAnswer(user, user)).toBe(false);
  });
});
