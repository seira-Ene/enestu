import { describe, expect, it } from "vitest";
import {
  parseAnswerLogInput,
  parseCardDraft,
  parseQuizCardInput,
} from "./quiz-input";

const card = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  subject: "線形代数",
  question: "Av = λv の λ を何と呼ぶ？",
  answer: "固有値",
};

describe("parseQuizCardInput", () => {
  it("正しい入力を受け取り、余分な項目は捨てる", () => {
    expect(parseQuizCardInput({ ...card, device_id: "x" })).toEqual({
      ok: true,
      value: card,
    });
  });

  it.each([null, undefined, "text", 1, [], {}])("%j を拒否する", (body) => {
    expect(parseQuizCardInput(body).ok).toBe(false);
  });

  it("IDがなければ拒否するが、下書きとしては受け取る", () => {
    const { subject, question, answer } = card;
    const draft = { subject, question, answer };
    expect(parseQuizCardInput(draft).ok).toBe(false);
    expect(parseCardDraft(draft)).toEqual({ ok: true, value: draft });
  });

  it("問題は200文字、答えは100文字まで", () => {
    const ok = (o: object) => parseQuizCardInput({ ...card, ...o }).ok;
    expect(ok({ question: "あ".repeat(200) })).toBe(true);
    expect(ok({ question: "あ".repeat(201) })).toBe(false);
    expect(ok({ answer: "あ".repeat(100) })).toBe(true);
    expect(ok({ answer: "あ".repeat(101) })).toBe(false);
  });

  it("問題だけ改行を許す", () => {
    const ok = (o: object) => parseQuizCardInput({ ...card, ...o }).ok;
    expect(ok({ question: "1行目\n2行目" })).toBe(true);
    expect(ok({ answer: "1行目\n2行目" })).toBe(false);
  });

  it("空欄を拒否する", () => {
    for (const key of ["subject", "question", "answer"]) {
      expect(parseQuizCardInput({ ...card, [key]: " 　" }).ok).toBe(false);
    }
  });
});

describe("parseAnswerLogInput", () => {
  const now = new Date("2026-11-24T03:00:00.000Z");
  const valid = {
    id: "3f2504e0-4f89-41d3-9a0c-0305e82c3302",
    cardId: card.id,
    userAnswer: "固有値",
    isCorrect: true,
    mistakeReason: null,
    answeredAt: "2026-11-24T03:00:00.000Z",
  };
  const isOk = (overrides: object) =>
    parseAnswerLogInput({ ...valid, ...overrides }, now).ok;

  it("正しい入力を受け取り、余分な項目は捨てる", () => {
    expect(parseAnswerLogInput({ ...valid, extra: 1 }, now)).toEqual({
      ok: true,
      value: valid,
    });
  });

  it.each([null, undefined, "text", [], {}])("%j を拒否する", (body) => {
    expect(parseAnswerLogInput(body, now).ok).toBe(false);
  });

  it("IDとカードIDの両方を検証する", () => {
    expect(isOk({ id: "x" })).toBe(false);
    expect(isOk({ cardId: "x" })).toBe(false);
  });

  it("正誤は真偽値だけを受け付ける", () => {
    for (const isCorrect of ["true", 1, null, undefined]) {
      expect(isOk({ isCorrect })).toBe(false);
    }
  });

  it("「わからない」は空文字の不正解として受け付ける", () => {
    expect(isOk({ userAnswer: "", isCorrect: false })).toBe(true);
    expect(isOk({ userAnswer: "", isCorrect: true })).toBe(false);
    expect(isOk({ userAnswer: null, isCorrect: false })).toBe(false);
  });

  it("誤答原因は、不正解のときだけ3種類を受け付ける", () => {
    for (const mistakeReason of ["knowledge", "understanding", "careless"]) {
      expect(isOk({ isCorrect: false, mistakeReason })).toBe(true);
      expect(isOk({ isCorrect: true, mistakeReason })).toBe(false);
    }
    for (const mistakeReason of ["other", "", 1, true, {}]) {
      expect(isOk({ isCorrect: false, mistakeReason })).toBe(false);
    }
  });

  it("誤答原因の省略は、未分類（null）にする", () => {
    const body: Record<string, unknown> = { ...valid, isCorrect: false };
    delete body.mistakeReason;
    expect(parseAnswerLogInput(body, now)).toEqual({
      ok: true,
      value: { ...valid, isCorrect: false, mistakeReason: null },
    });
  });

  it("解答は100文字まで", () => {
    expect(isOk({ userAnswer: "あ".repeat(100) })).toBe(true);
    expect(isOk({ userAnswer: "あ".repeat(101) })).toBe(false);
  });

  it("未来の解答時刻は5分のずれまで許す", () => {
    expect(isOk({ answeredAt: "2026-11-24T03:05:00.000Z" })).toBe(true);
    expect(isOk({ answeredAt: "2026-11-24T03:05:00.001Z" })).toBe(false);
  });
});
