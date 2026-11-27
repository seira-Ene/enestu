import { describe, expect, it } from "vitest";
import {
  MAX_EXPLANATION_LENGTH,
  MAX_KEYWORD_LENGTH,
  MAX_KEYWORDS,
  MAX_TERM_LENGTH,
  parseExplanationInput,
  parseTermDraft,
  parseTermInput,
  splitKeywordLines,
} from "./explanation-input";

const ID = "11111111-1111-4111-8111-111111111111";
const TERM_ID = "22222222-2222-4222-8222-222222222222";
const NOW = new Date("2026-12-01T00:00:00Z");

describe("splitKeywordLines", () => {
  it("1行に1つ取り出し、空の行と前後の空白を捨てる", () => {
    expect(splitKeywordLines(" 光 \r\n\n　酸素\n")).toEqual(["光", "酸素"]);
    expect(splitKeywordLines(" \n ")).toEqual([]);
  });
});

describe("parseTermDraft", () => {
  const draft = {
    subject: "理科",
    term: "光合成",
    keywords: ["酸素", "二酸化炭素/CO2"],
  };

  it("前後の空白を除いて受け取り、余分な項目は捨てる", () => {
    expect(
      parseTermDraft({
        ...draft,
        term: " 光合成 ",
        keywords: [" 酸素 ", "二酸化炭素/CO2"],
        extra: 1,
      }),
    ).toEqual({ ok: true, value: draft });
  });

  it("上限ちょうどまで受け取る", () => {
    const keywords = Array.from({ length: MAX_KEYWORDS }, (_, index) =>
      String(index).repeat(MAX_KEYWORD_LENGTH),
    );
    const term = "あ".repeat(MAX_TERM_LENGTH);
    expect(parseTermDraft({ ...draft, term, keywords }).ok).toBe(true);
  });

  it.each([
    ["null", null],
    ["科目なし", { ...draft, subject: " " }],
    ["用語なし", { ...draft, term: "" }],
    ["長い用語", { ...draft, term: "あ".repeat(MAX_TERM_LENGTH + 1) }],
    ["観点なし", { ...draft, keywords: [] }],
    ["観点が文字列", { ...draft, keywords: "酸素" }],
    ["空の観点", { ...draft, keywords: ["酸素", " "] }],
    ["区切りだけ", { ...draft, keywords: [" / ／ "] }],
    ["改行入り", { ...draft, keywords: ["酸\n素"] }],
    ["数値の観点", { ...draft, keywords: [1] }],
    [
      "長い観点",
      { ...draft, keywords: ["あ".repeat(MAX_KEYWORD_LENGTH + 1)] },
    ],
    [
      "多すぎる観点",
      {
        ...draft,
        keywords: Array.from({ length: MAX_KEYWORDS + 1 }, (_, i) => `k${i}`),
      },
    ],
    ["同じ観点", { ...draft, keywords: ["CO2", "ＣＯ２"] }],
    ["言い換えが重なる", { ...draft, keywords: ["光/ひかり", "ひかり"] }],
  ])("%s は拒否する", (_label, body) => {
    expect(parseTermDraft(body).ok).toBe(false);
  });

  it("登録にはIDが要る", () => {
    expect(parseTermInput({ ...draft, id: ID })).toEqual({
      ok: true,
      value: { ...draft, id: ID },
    });
    expect(parseTermInput(draft).ok).toBe(false);
    expect(parseTermInput({ ...draft, id: "x" }).ok).toBe(false);
  });
});

describe("parseExplanationInput", () => {
  const input = {
    id: ID,
    termId: TERM_ID,
    body: "植物が\n養分を作る",
    explainedAt: "2026-12-01T00:00:00.000Z",
  };

  it("改行を残して受け取る", () => {
    expect(parseExplanationInput({ ...input, extra: 1 }, NOW)).toEqual({
      ok: true,
      value: input,
    });
  });

  it("上限ちょうどまで受け取る", () => {
    const body = "あ".repeat(MAX_EXPLANATION_LENGTH);
    expect(parseExplanationInput({ ...input, body }, NOW).ok).toBe(true);
  });

  it.each([
    ["null", null],
    ["IDなし", { ...input, id: undefined }],
    ["用語なし", { ...input, termId: "x" }],
    ["空の説明", { ...input, body: " \n " }],
    ["長い説明", { ...input, body: "あ".repeat(MAX_EXPLANATION_LENGTH + 1) }],
    ["制御文字", { ...input, body: "a\u0007b" }],
    ["時刻なし", { ...input, explainedAt: undefined }],
    ["未来の時刻", { ...input, explainedAt: "2026-12-01T01:00:00.000Z" }],
  ])("%s は拒否する", (_label, body) => {
    expect(parseExplanationInput(body, NOW).ok).toBe(false);
  });
});
