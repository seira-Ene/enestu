import type { FormEvent } from "react";
import { formatClock } from "@/domain/study-time";
import type { ThemeTerms } from "@/themes/types";

/** 待機中／計測中／保存中／保存失敗。 */
export type TimerPhase = "ready" | "running" | "saving" | "unsaved";

type Props = {
  terms: ThemeTerms;
  phase: TimerPhase;
  subject: string;
  seconds: number;
  message: string | null;
  onSubjectChange: (subject: string) => void;
  onStart: () => void;
  onStop: () => void;
  onRetry: () => void;
  onDiscard: () => void;
};

const PRIMARY_BUTTON =
  "w-full rounded-xl bg-primary px-4 py-4 text-lg font-bold text-background transition-opacity hover:opacity-90 disabled:opacity-50";

export function StudyTimer({
  terms,
  phase,
  subject,
  seconds,
  message,
  onSubjectChange,
  onStart,
  onStop,
  onRetry,
  onDiscard,
}: Props) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase === "ready") onStart();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl bg-surface p-4"
    >
      <label className="flex flex-col gap-1">
        <span className="text-sm text-accent">{terms.subject}（科目名）</span>
        <input
          type="text"
          value={subject}
          onChange={(event) => onSubjectChange(event.target.value)}
          readOnly={phase !== "ready"}
          placeholder="例：線形代数"
          autoComplete="off"
          className="rounded-xl border border-accent bg-background px-4 py-3 text-base text-text placeholder:opacity-60 read-only:opacity-70"
        />
      </label>

      <p
        role="timer"
        className="text-center font-mono text-5xl font-bold tabular-nums"
      >
        {formatClock(seconds)}
      </p>

      {message !== null && (
        <p role="alert" className="rounded-xl border border-primary px-4 py-3">
          {message}
        </p>
      )}

      {phase === "ready" && (
        <button key="start" type="submit" className={PRIMARY_BUTTON}>
          {terms.startTimer}（開始）
        </button>
      )}
      {phase === "running" && (
        <button
          key="stop"
          type="button"
          onClick={onStop}
          className={PRIMARY_BUTTON}
        >
          {terms.stopTimer}（停止して記録）
        </button>
      )}
      {phase === "saving" && (
        <button key="saving" type="button" disabled className={PRIMARY_BUTTON}>
          保存しています…
        </button>
      )}
      {phase === "unsaved" && (
        <button
          key="retry"
          type="button"
          onClick={onRetry}
          className={PRIMARY_BUTTON}
        >
          もう一度保存
        </button>
      )}
      {(phase === "running" || phase === "unsaved") && (
        <button
          type="button"
          onClick={onDiscard}
          className="py-2 text-sm underline opacity-80"
        >
          記録せずにやめる
        </button>
      )}
    </form>
  );
}
