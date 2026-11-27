import { keywordVariants, type ExplainTerm } from "./explanation";
import {
  fail,
  isTooFarInFuture,
  parseIsoUtc,
  parseSubject,
  parseText,
  parseUuid,
  type ParseResult,
} from "./validation";

/** 上限は、DBの制約と合わせる。 */
export const MAX_TERM_LENGTH = 50;
export const MAX_KEYWORDS = 10;
export const MAX_KEYWORD_LENGTH = 60;
export const MAX_EXPLANATION_LENGTH = 1000;

export type TermDraft = Omit<ExplainTerm, "id">;

export type ExplanationInput = {
  readonly id: string;
  readonly termId: string;
  readonly body: string;
  readonly explainedAt: string;
};

/** 1行に1つ書かれた観点を、配列にする。空の行は捨てる。 */
export function splitKeywordLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

export function parseTermDraft(body: unknown): ParseResult<TermDraft> {
  if (typeof body !== "object" || body === null) {
    return fail("送信内容の形式が正しくありません。");
  }
  const fields: Partial<Record<keyof TermDraft, unknown>> = body;
  const subject = parseSubject(fields.subject);
  if (!subject.ok) return subject;
  const term = parseText(fields.term, { label: "用語", max: MAX_TERM_LENGTH });
  if (!term.ok) return term;
  const keywords = parseKeywords(fields.keywords);
  if (!keywords.ok) return keywords;
  return {
    ok: true,
    value: {
      subject: subject.value,
      term: term.value,
      keywords: keywords.value,
    },
  };
}

export function parseTermInput(body: unknown): ParseResult<ExplainTerm> {
  const draft = parseTermDraft(body);
  if (!draft.ok) return draft;
  const id = parseUuid(readField(body, "id"));
  if (!id.ok) return id;
  return { ok: true, value: { id: id.value, ...draft.value } };
}

export function parseExplanationInput(
  body: unknown,
  now: Date,
): ParseResult<ExplanationInput> {
  const id = parseUuid(readField(body, "id"));
  if (!id.ok) return id;
  const termId = parseUuid(readField(body, "termId"));
  if (!termId.ok) return termId;
  const text = parseExplanationBody(readField(body, "body"));
  if (!text.ok) return text;
  const explained = parseIsoUtc(readField(body, "explainedAt"));
  if (!explained.ok) return explained;
  if (isTooFarInFuture(explained.value, now)) {
    return fail("説明した時刻が未来です。端末の時計を確認してください。");
  }
  return {
    ok: true,
    value: {
      id: id.value,
      termId: termId.value,
      body: text.value,
      explainedAt: new Date(explained.value).toISOString(),
    },
  };
}

export function parseExplanationBody(value: unknown): ParseResult<string> {
  return parseText(value, {
    label: "説明",
    max: MAX_EXPLANATION_LENGTH,
    multiline: true,
  });
}

function parseKeywords(value: unknown): ParseResult<string[]> {
  if (!Array.isArray(value) || value.length === 0) {
    return fail("説明に入れたい観点を、1つ以上書いてください。");
  }
  if (value.length > MAX_KEYWORDS) {
    return fail(`観点は${MAX_KEYWORDS}個までです。`);
  }
  const keywords: string[] = [];
  const used = new Set<string>();
  for (const item of value) {
    const keyword = parseText(item, {
      label: "観点",
      max: MAX_KEYWORD_LENGTH,
    });
    if (!keyword.ok) return keyword;
    const variants = keywordVariants(keyword.value);
    if (variants.length === 0) {
      return fail("「/」だけの観点は使えません。");
    }
    if (variants.some((variant) => used.has(variant))) {
      return fail(`観点「${keyword.value}」が重なっています。`);
    }
    variants.forEach((variant) => used.add(variant));
    keywords.push(keyword.value);
  }
  return { ok: true, value: keywords };
}

function readField(body: unknown, key: string): unknown {
  if (typeof body !== "object" || body === null) return undefined;
  return new Map<string, unknown>(Object.entries(body)).get(key);
}
