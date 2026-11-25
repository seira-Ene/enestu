import { describe, expect, it } from "vitest";
import {
  fillHeroName,
  MAX_HERO_NAME_LENGTH,
  parseHeroName,
} from "./hero-name";

describe("parseHeroName", () => {
  it.each([
    ["そら", "そら"],
    ["  そら\n", "そら"],
    ["　全角の空白　", "全角の空白"],
    ["あ".repeat(MAX_HERO_NAME_LENGTH), "あ".repeat(MAX_HERO_NAME_LENGTH)],
    ["😀".repeat(MAX_HERO_NAME_LENGTH), "😀".repeat(MAX_HERO_NAME_LENGTH)],
    // 分かれた濁点は、1文字にまとめる。
    ["がく", "がく"],
  ])("「%s」を受け取る", (value, name) => {
    expect(parseHeroName(value)).toEqual({ ok: true, value: name });
  });

  it.each([null, "", "   ", "　"])("%j なら、名前なしにする", (value) => {
    expect(parseHeroName(value)).toEqual({ ok: true, value: null });
  });

  it.each([
    ["長すぎる", "あ".repeat(MAX_HERO_NAME_LENGTH + 1)],
    ["改行", "そ\nら"],
    ["制御文字", "そ\u0007ら"],
    ["見えない文字", "そ​ら"],
    ["向きを変える文字", "‮そら"],
    ["行区切り", "そ ら"],
    ["数値", 1],
    ["配列", ["そら"]],
    ["未指定", undefined],
  ])("%s は拒否する", (_label, value) => {
    expect(parseHeroName(value).ok).toBe(false);
  });
});

describe("fillHeroName", () => {
  it("すべての {name} に名前を入れる", () => {
    expect(fillHeroName(["{name}、{name}！", "おかえり、{name}"], "そら")).toEqual(
      ["そら、そら！", "おかえり、そら"],
    );
  });

  it("特別な意味を持つ記号も、そのまま入れる", () => {
    expect(fillHeroName(["{name}さん"], "$&$1")).toEqual(["$&$1さん"]);
  });
});
