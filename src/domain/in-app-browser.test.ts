import { describe, expect, it } from "vitest";
import { isInAppBrowser } from "./in-app-browser";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)";
const ANDROID = "Mozilla/5.0 (Linux; Android 15; Pixel 9";

describe("isInAppBrowser", () => {
  it.each([
    ["LINE（iPhone）", `${IPHONE} Mobile/15E148 Safari Line/15.1.0`],
    ["LINE（Android）", `${ANDROID}; wv) Chrome/130.0 Mobile Safari/537.36 Line/15.1.0/IAB`],
    ["Instagram", `${IPHONE} Mobile/15E148 Instagram 350.0.0`],
    ["Facebook", `${IPHONE} Mobile/15E148 [FBAN/FBIOS;FBAV/480.0]`],
    ["X", `${IPHONE} Mobile/15E148 Twitter for iPhone/10.60`],
    ["Androidの組み込み", `${ANDROID}; wv) AppleWebKit/537.36 Chrome/130.0`],
  ])("%s はアプリ内ブラウザ", (_label, userAgent) => {
    expect(isInAppBrowser(userAgent)).toBe(true);
  });

  it.each([
    ["Safari", `${IPHONE} Version/18.0 Mobile/15E148 Safari/604.1`],
    ["Chrome（Android）", `${ANDROID}) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36`],
    ["Edge", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36 Edg/130.0"],
    ["似た単語", `${ANDROID}) Chrome/130.0 Online/1.0`],
    ["空", ""],
  ])("%s は普通のブラウザ", (_label, userAgent) => {
    expect(isInAppBrowser(userAgent)).toBe(false);
  });
});
