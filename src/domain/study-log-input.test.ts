import { describe, expect, it } from "vitest";
import { parseStudyLogInput, parseSubject, parseUuid } from "./study-log-input";

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

describe("parseUuid", () => {
  it("UUIDを小文字にそろえて受け取る", () => {
    expect(parseUuid(valid.id.toUpperCase())).toEqual({
      ok: true,
      value: valid.id,
    });
  });

  it.each([null, undefined, 1, "", "abc", `${valid.id}x`, `${valid.id}\n`])(
    "%j を拒否する",
    (value) => {
      expect(parseUuid(value).ok).toBe(false);
    },
  );
});

describe("parseSubject", () => {
  it("前後の空白（全角を含む）を除く", () => {
    expect(parseSubject(" 　英語 ")).toEqual({ ok: true, value: "英語" });
  });

  it.each(["", "  　", null, 1, "a\u0000b", "a\nb", "\ud800"])(
    "%j を拒否する",
    (value) => {
      expect(parseSubject(value).ok).toBe(false);
    },
  );

  it("50文字まで受け付け、絵文字は1文字と数える", () => {
    expect(parseSubject("あ".repeat(50)).ok).toBe(true);
    expect(parseSubject("📘".repeat(50)).ok).toBe(true);
    expect(parseSubject("あ".repeat(51)).ok).toBe(false);
  });
});

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
