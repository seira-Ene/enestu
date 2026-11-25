import { describe, expect, it } from "vitest";
import { needsNewToken, retryDelayMs, tokenExpiresAt } from "./live-connection";

const NOW = new Date("2026-12-01T00:00:00Z");

function tokenOf(claims: unknown): string {
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `header.${body}.signature`;
}

describe("retryDelayMs", () => {
  it.each([
    [0, 1_000],
    [1, 1_000],
    [2, 2_000],
    [5, 30_000],
    [100, 30_000],
  ])("%i回続けて失敗したら %iミリ秒待つ", (failures, delay) => {
    expect(retryDelayMs(failures)).toBe(delay);
  });
});

describe("tokenExpiresAt", () => {
  it("期限をミリ秒で返す", () => {
    expect(tokenExpiresAt(tokenOf({ exp: 1_800_000_000 }))).toBe(
      1_800_000_000_000,
    );
  });

  it("URL用の文字を含んでも読み取れる", () => {
    expect(tokenExpiresAt(tokenOf({ exp: 1, name: "??>>~~" }))).toBe(1000);
  });

  it.each([
    ["空", ""],
    ["区切りなし", "token"],
    ["壊れた中身", "a.!!!.b"],
    ["JSONでない", `a.${Buffer.from("x").toString("base64url")}.b`],
    ["期限なし", tokenOf({})],
    ["期限が文字列", tokenOf({ exp: "1" })],
    ["null", tokenOf(null)],
  ])("%s なら null", (_label, token) => {
    expect(tokenExpiresAt(token)).toBeNull();
  });
});

describe("needsNewToken", () => {
  const expiring = (seconds: number) =>
    tokenOf({ exp: NOW.getTime() / 1000 + seconds });

  it("鍵がないか読めなければ、取り直す", () => {
    expect(needsNewToken(null, NOW)).toBe(true);
    expect(needsNewToken("broken", NOW)).toBe(true);
  });

  it("残り75秒を切ったら取り直す", () => {
    expect(needsNewToken(expiring(3600), NOW)).toBe(false);
    expect(needsNewToken(expiring(75), NOW)).toBe(false);
    expect(needsNewToken(expiring(74), NOW)).toBe(true);
    expect(needsNewToken(expiring(-1), NOW)).toBe(true);
  });
});
