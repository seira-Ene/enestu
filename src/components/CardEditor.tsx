import type { FormEvent } from "react";
import type { QuizCard } from "@/domain/quiz";
import {
  ALERT,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
  TEXT_INPUT,
} from "./form-styles";

export type CardDraft = Omit<QuizCard, "id">;

type Props = {
  draft: CardDraft;
  isSaving: boolean;
  error: string | null;
  onChange: (draft: CardDraft) => void;
  onSave: () => void;
  onCancel: () => void;
};

/** 登録済みのカードを、一覧の中で直す。 */
export function CardEditor({
  draft,
  isSaving,
  error,
  onChange,
  onSave,
  onCancel,
}: Props) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSaving) onSave();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm text-accent">科目名</span>
        <input
          type="text"
          value={draft.subject}
          onChange={(e) => onChange({ ...draft, subject: e.target.value })}
          readOnly={isSaving}
          autoComplete="off"
          className={TEXT_INPUT}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-accent">問題</span>
        <textarea
          value={draft.question}
          onChange={(e) => onChange({ ...draft, question: e.target.value })}
          readOnly={isSaving}
          rows={3}
          className={TEXT_INPUT}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-accent">答え</span>
        <input
          type="text"
          value={draft.answer}
          onChange={(e) => onChange({ ...draft, answer: e.target.value })}
          readOnly={isSaving}
          autoComplete="off"
          className={TEXT_INPUT}
        />
      </label>
      {error !== null && (
        <p role="alert" className={ALERT}>
          {error}
        </p>
      )}
      <button type="submit" disabled={isSaving} className={PRIMARY_BUTTON}>
        {isSaving ? "保存しています…" : "変更を保存"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={isSaving}
        className={SECONDARY_BUTTON}
      >
        やめる
      </button>
    </form>
  );
}
