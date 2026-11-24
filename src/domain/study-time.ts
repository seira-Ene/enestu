export type StudyLog = {
  readonly id: string;
  readonly subject: string;
  readonly startedAt: string;
  readonly endedAt: string;
  readonly durationSeconds: number;
};

/** 日本は夏時間がないため、UTCとの差は常に9時間。 */
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 指定時刻を含む日本時間の1日を、[start, end) で返す。 */
export function jstDayRange(now: Date): { start: Date; end: Date } {
  const dayIndex = Math.floor((now.getTime() + JST_OFFSET_MS) / DAY_MS);
  const startMs = dayIndex * DAY_MS - JST_OFFSET_MS;
  return { start: new Date(startMs), end: new Date(startMs + DAY_MS) };
}

/** 終了時刻が日本時間の今日に入る記録だけを残す。 */
export function filterTodayLogs(
  logs: readonly StudyLog[],
  now: Date,
): StudyLog[] {
  const { start, end } = jstDayRange(now);
  return logs.filter((log) => {
    const endedMs = Date.parse(log.endedAt);
    return endedMs >= start.getTime() && endedMs < end.getTime();
  });
}

/** 今日の合計学習時間（秒）。 */
export function sumTodaySeconds(logs: readonly StudyLog[], now: Date): number {
  return filterTodayLogs(logs, now).reduce(
    (total, log) => total + log.durationSeconds,
    0,
  );
}

/** 開始時刻からの経過秒。時計のずれで負になる場合は0にする。 */
export function elapsedSeconds(startedAt: string, now: Date): number {
  return toWholeSeconds((now.getTime() - Date.parse(startedAt)) / 1000);
}

/** 「1時間2分3秒」。先頭の0の単位は省く（65 → 1分5秒）。 */
export function formatDuration(seconds: number): string {
  const { h, m, s } = splitSeconds(seconds);
  if (h > 0) return `${h}時間${m}分${s}秒`;
  if (m > 0) return `${m}分${s}秒`;
  return `${s}秒`;
}

/** タイマー表示用の「01:02:03」。 */
export function formatClock(seconds: number): string {
  const { h, m, s } = splitSeconds(seconds);
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

/** 日本時間の「14:05」。 */
export function formatJstTime(iso: string): string {
  return new Date(Date.parse(iso) + JST_OFFSET_MS).toISOString().slice(11, 16);
}

function toWholeSeconds(seconds: number): number {
  return Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
}

function splitSeconds(seconds: number): { h: number; m: number; s: number } {
  const whole = toWholeSeconds(seconds);
  return {
    h: Math.floor(whole / 3600),
    m: Math.floor((whole % 3600) / 60),
    s: whole % 60,
  };
}
