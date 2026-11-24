import { describe, expect, it } from "vitest";
import { parseStudyLogInput } from "./study-log-input";

const now = new Date("2026-11-24T03:00:00.000Z");
const valid = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  subject: "線形代数",
  startedAt: "2026-11-24T02:00:00.000Z",
  endedAt: "2026-11-24T02:30:00.000Z",
};

function isOk(overrides: Record<string, unknown>): boolean {
  return parseStudyLogInput({ ...valid, ...overrides }, now).ok;
}

describe("parseStudyLogInput", () => {
  it("正しい入力を受け取り、余分な項目は捨てる", () => {
    expect(
      parseStudyLogInput({ ...valid, deviceId: "x", extra: 1 }, now),
    ).toEqual({ ok: true, value: valid });
  });

  it.each([null, undefined, "text", 1, [], {}])("%j を拒否する", (body) => {
    expect(parseStudyLogInput(body, now).ok).toBe(false);
  });

  it("時刻の形式が違えば拒否する", () => {
    expect(isOk({ startedAt: "2026-11-24" })).toBe(false);
    expect(isOk({ startedAt: "2026-13-40T00:00:00Z" })).toBe(false);
    expect(isOk({ endedAt: 1_700_000_000_000 })).toBe(false);
  });

  it("1秒以上だけを受け付ける", () => {
    expect(isOk({ endedAt: "2026-11-24T02:00:00.999Z" })).toBe(false);
    expect(isOk({ endedAt: "2026-11-24T02:00:01.000Z" })).toBe(true);
    expect(isOk({ endedAt: "2026-11-24T01:59:00.000Z" })).toBe(false);
  });

  it("24時間ちょうどまで受け付ける", () => {
    expect(
      isOk({
        startedAt: "2026-11-23T02:30:00.000Z",
        endedAt: "2026-11-24T02:30:00.000Z",
      }),
    ).toBe(true);
    expect(
      isOk({
        startedAt: "2026-11-23T02:29:59.000Z",
        endedAt: "2026-11-24T02:30:00.000Z",
      }),
    ).toBe(false);
  });

  it("未来の終了時刻は5分のずれまで許す", () => {
    expect(isOk({ endedAt: "2026-11-24T03:05:00.000Z" })).toBe(true);
    expect(isOk({ endedAt: "2026-11-24T03:05:00.001Z" })).toBe(false);
  });
});
