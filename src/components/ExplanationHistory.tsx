import {
  understandingPercent,
  type ExplainTerm,
  type ExplanationLog,
} from "@/domain/explanation";
import { formatJstDateTime } from "@/domain/study-time";
import { HEADING, ITEM, PANEL } from "./form-styles";

type Props = {
  logs: readonly ExplanationLog[];
  terms: readonly ExplainTerm[];
};

export function ExplanationHistory({ logs, terms }: Props) {
  const termById = new Map(terms.map((term) => [term.id, term]));
  return (
    <section className={PANEL} aria-labelledby="explanation-history-title">
      <h2 id="explanation-history-title" className={HEADING}>
        説明の記録（直近20件）
      </h2>
      {logs.length === 0 ? (
        <p className="opacity-80">まだ説明していません。</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {logs.map((log) => (
            <li key={log.id} className={ITEM}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 break-words font-bold">
                  {termById.get(log.termId)?.term ?? "（削除した用語）"}
                </p>
                <p className="font-display shrink-0 tabular-nums">
                  {understandingPercent(log.totalCount, log.missing.length)}%
                </p>
              </div>
              <p className="text-sm opacity-80">
                {formatJstDateTime(log.explainedAt)}
              </p>
              <details>
                <summary className="cursor-pointer text-sm opacity-80">
                  説明を見る
                </summary>
                <p className="break-words whitespace-pre-wrap">{log.body}</p>
                {log.missing.length > 0 && (
                  <p className="mt-1 break-words text-sm">
                    足りなかった観点：{log.missing.join("、")}
                  </p>
                )}
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
