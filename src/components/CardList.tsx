import type { QuizCard } from "@/domain/quiz";
import type { QuizTerms } from "@/themes/types";
import { PANEL } from "./form-styles";

type Props = {
  terms: QuizTerms;
  /** まだ取得できていなければ null。 */
  cards: readonly QuizCard[] | null;
  error: string | null;
  onReload: () => void;
};

export function CardList({ terms, cards, error, onReload }: Props) {
  return (
    <section className={PANEL}>
      <h2 className="text-sm text-accent">
        {terms.card}
        {cards !== null && `（${cards.length}枚）`}
      </h2>
      {error !== null && (
        <div role="alert" className="flex flex-col items-start gap-2">
          <p>{error}</p>
          <button type="button" onClick={onReload} className="underline">
            もう一度読み込む
          </button>
        </div>
      )}
      {cards === null && error === null && <p>読み込んでいます…</p>}
      {cards !== null && cards.length === 0 && (
        <p className="opacity-80">まだカードがありません。</p>
      )}
      {cards !== null && cards.length > 0 && (
        <ul className="flex flex-col gap-2">
          {cards.map((card) => (
            <li key={card.id} className="rounded-xl bg-background px-4 py-3">
              <p className="break-words text-sm text-accent">{card.subject}</p>
              <p className="break-words whitespace-pre-wrap font-bold">
                {card.question}
              </p>
              <details className="mt-1">
                <summary className="cursor-pointer text-sm opacity-80">
                  答えを見る
                </summary>
                <p className="break-words">{card.answer}</p>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
