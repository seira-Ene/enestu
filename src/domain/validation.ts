export type ParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };

export type TextRule = {
  readonly label: string;
  readonly max: number;
  readonly allowEmpty?: boolean;
  /** 改行を許す。それ以外の制御文字は常に拒否する。 */
  readonly multiline?: boolean;
};

export const MAX_SUBJECT_LENGTH = 50;

/** 利用者の端末の時計が進んでいる場合に許す幅。 */
const CLOCK_SKEW_MS = 5 * 60 * 1000;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
/** 制御文字と、対になっていないサロゲート。DBに保存できないものを含む。 */
const INVALID_TEXT_PATTERN = /[\p{Cc}\p{Cs}]/u;

export function parseUuid(value: unknown): ParseResult<string> {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    return fail("IDの形式が正しくありません。");
  }
  return { ok: true, value: value.toLowerCase() };
}

/** 前後の空白を除き、文字数と使える文字を検証する。 */
export function parseText(value: unknown, rule: TextRule): ParseResult<string> {
  const text =
    typeof value === "string" ? value.replaceAll("\r\n", "\n").trim() : null;
  if (text === null || (text === "" && !rule.allowEmpty)) {
    return fail(`${rule.label}を入力してください。`);
  }
  // DBの char_length と同じく、サロゲートペアを1文字と数える。
  if ([...text].length > rule.max) {
    return fail(`${rule.label}は${rule.max}文字以内で入力してください。`);
  }
  const checked = rule.multiline ? text.replaceAll("\n", "") : text;
  if (INVALID_TEXT_PATTERN.test(checked)) {
    return fail(`${rule.label}に使えない文字が含まれています。`);
  }
  return { ok: true, value: text };
}

export function parseSubject(value: unknown): ParseResult<string> {
  return parseText(value, { label: "科目名", max: MAX_SUBJECT_LENGTH });
}

/** UTCのISO形式の時刻を、エポックからのミリ秒にする。 */
export function parseIsoUtc(value: unknown): ParseResult<number> {
  const ms =
    typeof value === "string" && ISO_UTC_PATTERN.test(value)
      ? Date.parse(value)
      : Number.NaN;
  return Number.isNaN(ms)
    ? fail("時刻の形式が正しくありません。")
    : { ok: true, value: ms };
}

/** 端末の時計のずれとして許せる範囲を超えた未来か。 */
export function isTooFarInFuture(ms: number, now: Date): boolean {
  return ms > now.getTime() + CLOCK_SKEW_MS;
}

export function fail(error: string): {
  readonly ok: false;
  readonly error: string;
} {
  return { ok: false, error };
}
