import { describe, expect, it } from "vitest";
import {
  MAX_DURATION_SECONDS,
  parseStudyLogInput,
} from "./study-log-input";

const now = new Date("2026-11-24T03:00:00.000Z");

/** 2026-11-24T02:30Z に終わる、seconds 秒の記録。 */
function lasting(seconds: number): { startedAt: string; endedAt: string } {
  const endedMs = Date.parse("2026-11-24T02:30:00.000Z");
  return {
    startedAt: new Date(endedMs - seconds * 1000).toISOString(),
    endedAt: new Date(endedMs).toISOString(),
  };
}
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

  it.each([
    ["24時間", 24 * 3600],
    ["24時間1秒", 24 * 3600 + 1],
    ["30時間", 30 * 3600],
    ["999時間ちょうど", MAX_DURATION_SECONDS],
  ])("%s の記録を受け付ける", (_label, seconds) => {
    expect(isOk(lasting(seconds))).toBe(true);
  });

  it("999時間を1秒でも超えたら拒否する", () => {
    const result = parseStudyLogInput(
      { ...valid, ...lasting(MAX_DURATION_SECONDS + 1) },
      now,
    );
    expect(result).toEqual({
      ok: false,
      error:
        "999時間を超える記録は保存できません。「記録せずにやめる」を選んでください。",
    });
  });

  it("未来の終了時刻は5分のずれまで許す", () => {
    expect(isOk({ endedAt: "2026-11-24T03:05:00.000Z" })).toBe(true);
    expect(isOk({ endedAt: "2026-11-24T03:05:00.001Z" })).toBe(false);
  });
});
