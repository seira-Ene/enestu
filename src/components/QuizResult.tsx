import { correctPercent, type QuizScore } from "@/domain/quiz";
import type { WorldTheme } from "@/themes/types";
import { CharacterArt } from "./CharacterArt";
import { HEADING, PANEL, PRIMARY_BUTTON, SECONDARY_BUTTON } from "./form-styles";

type Props = {
  theme: WorldTheme;
  score: QuizScore;
  onRetry: () => void;
  onFinish: () => void;
};

export function QuizResult({ theme, score, onRetry, onFinish }: Props) {
  return (
    <section className={PANEL}>
      <h2 className={HEADING}>結果</h2>
      {correctPercent(score) === 100 && (
        <div className="overflow-hidden rounded-[min(var(--decor-radius),12px)] motion-safe:animate-appear">
          <CharacterArt theme={theme} kind="scene" />
        </div>
      )}
      <p className="font-display text-center text-4xl tabular-nums">
        {score.correct} / {score.total}問正解
      </p>
      <button type="button" onClick={onRetry} className={PRIMARY_BUTTON}>
        {theme.quiz.terms.retry}（再テスト）
      </button>
      <button type="button" onClick={onFinish} className={SECONDARY_BUTTON}>
        終わる
      </button>
    </section>
  );
}
