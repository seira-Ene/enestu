import { correctPercent, type QuizScore } from "@/domain/quiz";
import type { QuizStageTheme } from "@/themes/types";

type Props = {
  stage: QuizStageTheme;
  score: QuizScore;
  /** 正解した直後に、一度だけ動かす。 */
  isHit: boolean;
};

export function QuizStage({ stage, score, isHit }: Props) {
  const percent = correctPercent(score);
  const isCleared = percent === 100;
  const gauge = stage.gaugeDirection === "drain" ? 100 - percent : percent;

  return (
    <section
      aria-label={stage.name}
      className="flex flex-col items-center gap-2 rounded-2xl bg-surface p-4"
    >
      <span
        aria-hidden="true"
        className={`text-6xl ${isHit ? "motion-safe:animate-bounce" : ""}`}
      >
        {isCleared ? stage.clearedEmoji : stage.emoji}
      </span>
      <p className="font-bold">{isCleared ? stage.clearedMessage : stage.name}</p>
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
          className="h-4 overflow-hidden rounded-full bg-background"
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
