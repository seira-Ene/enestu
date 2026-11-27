import {
  fail,
  isTooFarInFuture,
  parseIsoUtc,
  parseSubject,
  parseUuid,
  type ParseResult,
} from "./validation";

export type StudyLogInput = {
  readonly id: string;
  readonly subject: string;
  readonly startedAt: string;
  readonly endedAt: string;
};

/** 1回の記録の上限（999時間）。DBの制約と合わせる。 */
export const MAX_DURATION_HOURS = 999;
export const MAX_DURATION_SECONDS = MAX_DURATION_HOURS * 60 * 60;

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
  const started = parseIsoUtc(fields.startedAt);
  if (!started.ok) return started;
  const ended = parseIsoUtc(fields.endedAt);
  if (!ended.ok) return ended;

  if (isTooFarInFuture(ended.value, now)) {
    return fail("終了時刻が未来です。端末の時計を確認してください。");
  }
  const durationSeconds = Math.floor((ended.value - started.value) / 1000);
  if (durationSeconds < 1) {
    return fail("1秒未満の記録は保存できません。");
  }
  if (durationSeconds > MAX_DURATION_SECONDS) {
    return fail(
      `${MAX_DURATION_HOURS}時間を超える記録は保存できません。「記録せずにやめる」を選んでください。`,
    );
  }

  return {
    ok: true,
    value: {
      id: id.value,
      subject: subject.value,
      startedAt: new Date(started.value).toISOString(),
      endedAt: new Date(ended.value).toISOString(),
    },
  };
}
