import { describe, expect, it } from "vitest";
import { selectTalkLine } from "./talk";

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
