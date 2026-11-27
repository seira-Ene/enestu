import { describe, expect, it } from "vitest";
import { limitMessage, ROW_LIMITS } from "./limits";

describe("limitMessage", () => {
  it.each([
    [
      "quiz_cards",
      "カードは2000枚までです。使わないものを削除してから試してください。",
    ],
    [
      "study_logs",
      "学習の記録は24時間で200件までです。時間をおいてから試してください。",
    ],
  ] as const)("%s の文", (table, text) => {
    expect(limitMessage(table)).toBe(text);
  });

  it("どの上限も、普段の使い方より十分に大きい", () => {
    for (const { count } of Object.values(ROW_LIMITS)) {
      expect(count).toBeGreaterThanOrEqual(200);
    }
  });
});
