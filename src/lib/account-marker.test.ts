import { describe, expect, it } from "vitest";
import { parseAccountMarker } from "./account-marker";

const ID = "11111111-1111-4111-8111-111111111111";

describe("parseAccountMarker", () => {
  it.each([
    ["1つだけ", `enestu_account=${ID}`],
    ["ほかのCookieの間", `a=1; enestu_account=${ID}; b=2`],
    ["空白なし", `a=1;enestu_account=${ID};b=2`],
  ])("%s でも読み取る", (_label, cookie) => {
    expect(parseAccountMarker(cookie)).toBe(ID);
  });

  it.each([
    ["Cookieなし", ""],
    ["別の名前", `x_enestu_account=${ID}`],
    ["続きのある名前", `enestu_account2=${ID}`],
    ["空の値", "enestu_account="],
    ["値なし", "enestu_account"],
    ["UUIDでない", "enestu_account=alice"],
  ])("%s なら未ログインとして扱う", (_label, cookie) => {
    expect(parseAccountMarker(cookie)).toBeNull();
  });
});
