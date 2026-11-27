import { describe, expect, it } from "vitest";
import { keyLast4, parseAiKeyInput } from "./ai-key";

const KEY = `AIza${"a".repeat(30)}Bc_-9`;

describe("parseAiKeyInput", () => {
  it("Gemini のキーの形を受け付け、前後の空白を除く", () => {
    expect(parseAiKeyInput({ provider: "gemini", key: `  ${KEY}\n` })).toEqual({
      ok: true,
      value: { provider: "gemini", key: KEY },
    });
  });

  it.each([
    [null, "送信内容の形式が正しくありません。"],
    [{ provider: "openai", key: KEY }, "対応していないサービスです。"],
    [{ provider: "gemini" }, "キーを入力してください。"],
    [{ provider: "gemini", key: "  " }, "キーを入力してください。"],
    [{ provider: "gemini", key: KEY.slice(0, -1) }, "Gemini のキーの形ではありません。「AIza」で始まる39文字です。"],
    [{ provider: "gemini", key: `${KEY}x` }, "Gemini のキーの形ではありません。「AIza」で始まる39文字です。"],
    [{ provider: "gemini", key: `AIzb${KEY.slice(4)}` }, "Gemini のキーの形ではありません。「AIza」で始まる39文字です。"],
    [{ provider: "gemini", key: `${KEY.slice(0, -1)}!` }, "Gemini のキーの形ではありません。「AIza」で始まる39文字です。"],
  ])("正しくない入力は断る（%j）", (body, error) => {
    expect(parseAiKeyInput(body)).toEqual({ ok: false, error });
  });
});

describe("keyLast4", () => {
  it("末尾4文字だけを返す", () => {
    expect(keyLast4(KEY)).toBe("c_-9");
  });
});
