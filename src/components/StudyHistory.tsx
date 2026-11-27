import {
  formatDuration,
  formatStudyRange,
  type StudyLog,
} from "@/domain/study-time";
import type { ThemeTerms } from "@/themes/types";
import { HEADING, ITEM, PANEL } from "./form-styles";

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
    <section className={PANEL}>
      {/* 合計が長くても見出しを押しつぶさないよう、狭いときは折り返す。 */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className={HEADING}>{terms.todayTotal}</h2>
        <p className="font-display shrink-0 text-2xl tabular-nums">
          {totalSeconds === null ? "—" : formatDuration(totalSeconds)}
        </p>
      </div>

      <h2 className={HEADING}>{terms.history}（今日）</h2>
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
              className={`${ITEM} flex items-center justify-between gap-3`}
            >
              <div className="min-w-0">
                <p className="break-words font-bold">{log.subject}</p>
                <p className="text-sm opacity-80">
                  {formatStudyRange(log.startedAt, log.endedAt)}
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
