import {
  formatDuration,
  formatJstTime,
  type StudyLog,
} from "@/domain/study-time";
import type { ThemeTerms } from "@/themes/types";

type Props = {
  terms: ThemeTerms;
  /** 今日の記録。まだ取得できていなければ null。 */
  logs: readonly StudyLog[] | null;
  totalSeconds: number | null;
  error: string | null;
  onReload: () => void;
};

export function StudyHistory({
  terms,
  logs,
  totalSeconds,
  error,
  onReload,
}: Props) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-surface p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm text-accent">{terms.todayTotal}</h2>
        <p className="text-2xl font-bold tabular-nums">
          {totalSeconds === null ? "—" : formatDuration(totalSeconds)}
        </p>
      </div>

      <h2 className="text-sm text-accent">{terms.history}（今日）</h2>
      {error !== null && (
        <div role="alert" className="flex flex-col items-start gap-2">
          <p>{error}</p>
          <button type="button" onClick={onReload} className="underline">
            もう一度読み込む
          </button>
        </div>
      )}
      {logs === null && error === null && <p>読み込んでいます…</p>}
      {logs !== null && logs.length === 0 && (
        <p className="opacity-80">
          まだ記録がありません。最初の{terms.studySession}を始めましょう。
        </p>
      )}
      {logs !== null && logs.length > 0 && (
        <ul className="flex flex-col gap-2">
          {logs.map((log) => (
            <li
              key={log.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-background px-4 py-3"
            >
              <div className="min-w-0">
                <p className="break-words font-bold">{log.subject}</p>
                <p className="text-sm opacity-80">
                  {formatJstTime(log.startedAt)}〜{formatJstTime(log.endedAt)}
                </p>
              </div>
              <p className="shrink-0 tabular-nums">
                {formatDuration(log.durationSeconds)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
