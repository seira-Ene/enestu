export type StudyLogInput = {
  readonly id: string;
  readonly subject: string;
  readonly startedAt: string;
  readonly endedAt: string;
};

export type ParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };

export const MAX_SUBJECT_LENGTH = 50;
export const MAX_DURATION_SECONDS = 24 * 60 * 60;

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

export function parseSubject(value: unknown): ParseResult<string> {
  if (typeof value !== "string") return fail("科目名を入力してください。");
  const subject = value.trim();
  if (subject === "") return fail("科目名を入力してください。");
  // DBの char_length と同じく、サロゲートペアを1文字と数える。
  if ([...subject].length > MAX_SUBJECT_LENGTH) {
    return fail(`科目名は${MAX_SUBJECT_LENGTH}文字以内で入力してください。`);
  }
  if (INVALID_TEXT_PATTERN.test(subject)) {
    return fail("科目名に使えない文字が含まれています。");
  }
  return { ok: true, value: subject };
}

export function parseStudyLogInput(
  body: unknown,
  now: Date,
): ParseResult<StudyLogInput> {
  if (typeof body !== "object" || body === null) {
    return fail("送信内容の形式が正しくありません。");
  }
  const fields: Partial<Record<keyof StudyLogInput, unknown>> = body;

  const id = parseUuid(fields.id);
  if (!id.ok) return id;
  const subject = parseSubject(fields.subject);
  if (!subject.ok) return subject;

  const startedMs = parseIsoUtc(fields.startedAt);
  const endedMs = parseIsoUtc(fields.endedAt);
  if (startedMs === null || endedMs === null) {
    return fail("時刻の形式が正しくありません。");
  }
  if (endedMs > now.getTime() + CLOCK_SKEW_MS) {
    return fail("終了時刻が未来です。端末の時計を確認してください。");
  }

  const durationSeconds = Math.floor((endedMs - startedMs) / 1000);
  if (durationSeconds < 1) {
    return fail("1秒未満の記録は保存できません。");
  }
  if (durationSeconds > MAX_DURATION_SECONDS) {
    return fail("24時間を超える記録は保存できません。");
  }

  return {
    ok: true,
    value: {
      id: id.value,
      subject: subject.value,
      startedAt: new Date(startedMs).toISOString(),
      endedAt: new Date(endedMs).toISOString(),
    },
  };
}

function parseIsoUtc(value: unknown): number | null {
  if (typeof value !== "string" || !ISO_UTC_PATTERN.test(value)) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

function fail(error: string): { readonly ok: false; readonly error: string } {
  return { ok: false, error };
}
