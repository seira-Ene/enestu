import { correctPercent, type QuizScore } from "@/domain/quiz";
import type { WorldTheme } from "@/themes/types";
import { PANEL } from "./form-styles";
import { StageArt } from "./StageArt";

type Props = {
  theme: WorldTheme;
  score: QuizScore;
  /** 正解した直後に、一度だけ動かす。 */
  isHit: boolean;
};

export function QuizStage({ theme, score, isHit }: Props) {
  const { stage } = theme.quiz;
  const percent = correctPercent(score);
  const isCleared = percent === 100;
  const gauge = stage.gaugeDirection === "drain" ? 100 - percent : percent;

  return (
    <section aria-label={stage.name} className={`${PANEL} items-center`}>
      <div
        className={
          isCleared || isHit ? "motion-safe:animate-hit" : undefined
        }
      >
        <StageArt worldId={theme.id} percent={percent} />
      </div>
      <p className="font-display text-lg">
        {isCleared ? stage.clearedMessage : stage.name}
      </p>
      <div className="flex w-full flex-col gap-1">
        <p className="flex justify-between text-sm text-accent">
          <span>{stage.gaugeLabel}</span>
          <span className="tabular-nums">{gauge}%</span>
        </p>
        <div
          role="meter"
          aria-label={stage.gaugeLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={gauge}
          className="h-5 overflow-hidden rounded-[var(--decor-button-radius)] border-2 border-primary bg-background"
        >
          <div
            className="h-full bg-primary motion-safe:transition-[width] motion-safe:duration-500"
            style={{ width: `${gauge}%` }}
          />
        </div>
      </div>
    </section>
  );
}
