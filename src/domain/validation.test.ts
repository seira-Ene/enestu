import { describe, expect, it } from "vitest";
import {
  isTooFarInFuture,
  parseIsoUtc,
  parseSubject,
  parseText,
  parseUuid,
} from "./validation";

const uuid = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

describe("parseUuid", () => {
  it("UUIDを小文字にそろえて受け取る", () => {
    expect(parseUuid(uuid.toUpperCase())).toEqual({ ok: true, value: uuid });
  });

  it.each([null, undefined, 1, "", "abc", `${uuid}x`, `${uuid}\n`])(
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

describe("parseText", () => {
  it("allowEmpty のときだけ空を許す", () => {
    const rule = { label: "解答", max: 5 };
    expect(parseText(" ", rule).ok).toBe(false);
    expect(parseText(" ", { ...rule, allowEmpty: true })).toEqual({
      ok: true,
      value: "",
    });
    expect(parseText(null, { ...rule, allowEmpty: true }).ok).toBe(false);
  });

  it("multiline は改行だけを許し、改行コードをそろえる", () => {
    const rule = { label: "問題", max: 10, multiline: true };
    expect(parseText("a\r\nb", rule)).toEqual({ ok: true, value: "a\nb" });
    expect(parseText("a\tb", rule).ok).toBe(false);
    expect(parseText("a\u0000b", rule).ok).toBe(false);
  });
});

describe("parseIsoUtc", () => {
  it("UTCのISO形式だけを受け取る", () => {
    expect(parseIsoUtc("2026-11-24T00:00:00.000Z")).toEqual({
      ok: true,
      value: Date.UTC(2026, 10, 24),
    });
    for (const value of ["2026-11-24", "2026-13-40T00:00:00Z", 0, null]) {
      expect(parseIsoUtc(value).ok).toBe(false);
    }
  });
});

describe("isTooFarInFuture", () => {
  it("5分ちょうどまで許す", () => {
    const now = new Date("2026-11-24T00:00:00Z");
    expect(isTooFarInFuture(now.getTime() + 300_000, now)).toBe(false);
    expect(isTooFarInFuture(now.getTime() + 300_001, now)).toBe(true);
  });
});
