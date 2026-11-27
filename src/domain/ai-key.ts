import { fail, type ParseResult } from "./validation";

/**
 * 利用者が自分で用意するAIのAPIキー（BYOK）。
 * 今は Gemini だけに対応する。値は supabase/migrations の ai_keys・ai_requests と合わせる。
 */

export const AI_PROVIDERS = ["gemini"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

/** 1人1日に、AIを呼べる回数。 */
export const AI_DAILY_LIMIT = 20;

/** Gemini のキーの形。「AIza」で始まる39文字。 */
const GEMINI_KEY = /^AIza[0-9A-Za-z_-]{35}$/;

export type AiKeyInput = { readonly provider: AiProvider; readonly key: string };

export function parseAiKeyInput(body: unknown): ParseResult<AiKeyInput> {
  if (typeof body !== "object" || body === null) {
    return fail("送信内容の形式が正しくありません。");
  }
  const { provider, key }: Partial<Record<keyof AiKeyInput, unknown>> = body;
  if (provider !== "gemini") return fail("対応していないサービスです。");
  if (typeof key !== "string") return fail("キーを入力してください。");
  const trimmed = key.trim();
  if (trimmed === "") return fail("キーを入力してください。");
  if (!GEMINI_KEY.test(trimmed)) {
    return fail("Gemini のキーの形ではありません。「AIza」で始まる39文字です。");
  }
  return { ok: true, value: { provider, key: trimmed } };
}

/** 画面に出してよい、キーの末尾4文字。 */
export function keyLast4(key: string): string {
  return key.slice(-4);
}

/** 保存してあるキーの、画面に出してよい部分。 */
export type AiKeySummary = {
  readonly provider: AiProvider;
  readonly last4: string;
  readonly updatedAt: string;
};
