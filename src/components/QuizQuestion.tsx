import { useState, type FormEvent } from "react";
import type { MistakeReason, QuizCard } from "@/domain/quiz";
import {
  ALERT,
  PANEL,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
  TEXT_INPUT,
} from "./form-styles";
import { MistakeReasonPicker } from "./MistakeReasonPicker";

/** 答え合わせの結果。判定は記録する前なら直せる。 */
export type Judged = {
  readonly userAnswer: string;
  readonly isAutoCorrect: boolean;
  readonly isCorrect: boolean;
  /** 正解のときは使わない。 */
  readonly mistakeReason: MistakeReason | null;
};

type Props = {
  card: QuizCard;
  number: number;
  total: number;
  /** 答える前は null。 */
  judged: Judged | null;
  isSaving: boolean;
  error: string | null;
  onAnswer: (answer: string) => void;
  onToggleCorrect: () => void;
  onReasonChange: (reason: MistakeReason | null) => void;
  onNext: () => void;
};

export function QuizQuestion({
  card,
  number,
  total,
  judged,
  isSaving,
  error,
  onAnswer,
  onToggleCorrect,
  onReasonChange,
  onNext,
}: Props) {
  const [answer, setAnswer] = useState("");
  // 一度送った後は変えられない。サーバーに届いていた場合に、
  // 画面と記録が食い違うため。
  const isLocked = isSaving || error !== null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onAnswer(answer);
  }

  return (
    <section className={PANEL}>
      <p className="flex justify-between gap-2 text-sm text-accent">
        <span className="min-w-0 break-words">{card.subject}</span>
        <span className="shrink-0 tabular-nums">
          {number} / {total}問目
        </span>
      </p>
      <p className="break-words whitespace-pre-wrap text-lg font-bold">
        {card.question}
      </p>

      {judged === null ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-accent">あなたの答え</span>
            <input
              type="text"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              autoComplete="off"
              className={TEXT_INPUT}
            />
          </label>
          {error !== null && (
            <p role="alert" className={ALERT}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={answer.trim() === ""}
            className={PRIMARY_BUTTON}
          >
            答える
          </button>
          <button
            type="button"
            onClick={() => onAnswer("")}
            className={SECONDARY_BUTTON}
          >
            わからない
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          <p
            role="status"
            className={`text-2xl font-bold ${judged.isCorrect ? "text-accent" : "text-primary"}`}
          >
            {judged.isCorrect ? "○ 正解" : "× 不正解"}
          </p>
          <dl className="flex flex-col gap-2">
            <div>
              <dt className="text-sm opacity-80">正しい答え</dt>
              <dd className="break-words font-bold">{card.answer}</dd>
            </div>
            <div>
              <dt className="text-sm opacity-80">あなたの答え</dt>
              <dd className="break-words">
                {judged.userAnswer === "" ? "（わからない）" : judged.userAnswer}
              </dd>
            </div>
          </dl>
          {!judged.isAutoCorrect && judged.userAnswer !== "" && (
            <button
              type="button"
              onClick={onToggleCorrect}
              disabled={isLocked}
              className={SECONDARY_BUTTON}
            >
              {judged.isCorrect ? "不正解に戻す" : "正解にする"}
            </button>
          )}
          {!judged.isCorrect && (
            <MistakeReasonPicker
              value={judged.mistakeReason}
              disabled={isLocked}
              onChange={onReasonChange}
            />
          )}
          {error !== null && (
            <p role="alert" className={ALERT}>
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={onNext}
            disabled={isSaving}
            className={PRIMARY_BUTTON}
          >
            {nextLabel(isSaving, error !== null, number === total)}
          </button>
        </div>
      )}
    </section>
  );
}

function nextLabel(
  isSaving: boolean,
  hasError: boolean,
  isLast: boolean,
): string {
  if (isSaving) return "保存しています…";
  if (hasError) return "もう一度保存";
  return isLast ? "結果を見る" : "次へ";
}
