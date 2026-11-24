import type { AnswerLog, QuizCard } from "@/domain/quiz";
import { formatJstDateTime } from "@/domain/study-time";
import type { QuizTerms } from "@/themes/types";
import { PANEL } from "./form-styles";

type Props = {
  terms: QuizTerms;
  /** まだ取得できていなければ null。 */
  logs: readonly AnswerLog[] | null;
  cards: readonly QuizCard[];
  error: string | null;
  onReload: () => void;
};

export function AnswerHistory({ terms, logs, cards, error, onReload }: Props) {
  const cardById = new Map(cards.map((card) => [card.id, card]));

  return (
    <section className={PANEL}>
      <h2 className="text-sm text-accent">{terms.answerHistory}（直近20件）</h2>
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
        <p className="opacity-80">まだ解答がありません。</p>
      )}
      {logs !== null && logs.length > 0 && (
        <ul className="flex flex-col gap-2">
          {logs.map((log) => {
            const card = cardById.get(log.cardId);
            return (
              <li
                key={log.id}
                className="flex items-start gap-3 rounded-xl bg-background px-4 py-3"
              >
                <span
                  role="img"
                  aria-label={log.isCorrect ? "正解" : "不正解"}
                  className={`text-xl font-bold ${log.isCorrect ? "text-accent" : "text-primary"}`}
                >
                  {log.isCorrect ? "○" : "×"}
                </span>
                <div className="min-w-0">
                  <p className="break-words font-bold">
                    {card?.question ?? "（問題を読み込めませんでした）"}
                  </p>
                  <p className="break-words text-sm opacity-80">
                    {formatJstDateTime(log.answeredAt)}
                    {card !== undefined && `・${card.subject}`}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
