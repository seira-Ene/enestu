import type { FormEvent } from "react";
import { formatClock } from "@/domain/study-time";
import type { ThemeTerms } from "@/themes/types";
import { ALERT, PANEL, PRIMARY_BUTTON, TEXT_INPUT } from "./form-styles";

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
      className={PANEL}
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
          className={TEXT_INPUT}
        />
      </label>

      <p
        role="timer"
        className={`font-display text-center whitespace-nowrap ${
          // 100時間を超えると桁が増えるので、狭い画面でもはみ出さないよう小さくする。
          seconds >= 100 * 60 * 60
            ? "text-[clamp(1.6rem,10.5vw,3rem)]"
            : "text-[clamp(2rem,13vw,3rem)]"
        }`}
      >
        <span className="sr-only">{formatClock(seconds)}</span>
        {[...formatClock(seconds)].map((char, index) => (
          // 書体によらず、数字が変わっても位置がずれないようにする。
          <span
            key={index}
            aria-hidden="true"
            className={`inline-block text-center ${char === ":" ? "w-[0.5em]" : "w-[0.72em]"}`}
          >
            {char}
          </span>
        ))}
      </p>

      {message !== null && (
        <p role="alert" className={ALERT}>
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
