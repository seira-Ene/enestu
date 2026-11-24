import type { QuizScore } from "@/domain/quiz";
import type { QuizTerms } from "@/themes/types";
import { HEADING, PANEL, PRIMARY_BUTTON, SECONDARY_BUTTON } from "./form-styles";

type Props = {
  terms: QuizTerms;
  score: QuizScore;
  onRetry: () => void;
  onFinish: () => void;
};

export function QuizResult({ terms, score, onRetry, onFinish }: Props) {
  return (
    <section className={PANEL}>
      <h2 className={HEADING}>結果</h2>
      <p className="font-display text-center text-4xl tabular-nums">
        {score.correct} / {score.total}問正解
      </p>
      <button type="button" onClick={onRetry} className={PRIMARY_BUTTON}>
        {terms.retry}（再テスト）
      </button>
      <button type="button" onClick={onFinish} className={SECONDARY_BUTTON}>
        終わる
      </button>
    </section>
  );
}
