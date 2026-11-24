import type { FormEvent } from "react";
import type { QuizCard } from "@/domain/quiz";
import type { QuizTerms } from "@/themes/types";
import { ALERT, PANEL, PRIMARY_BUTTON, TEXT_INPUT } from "./form-styles";

export type CardDraft = Omit<QuizCard, "id">;

type Props = {
  terms: QuizTerms;
  draft: CardDraft;
  subjects: readonly string[];
  isSaving: boolean;
  error: string | null;
  /** 登録できたときの知らせ。 */
  notice: string | null;
  onChange: (draft: CardDraft) => void;
  onSubmit: () => void;
};

export function CardForm({
  terms,
  draft,
  subjects,
  isSaving,
  error,
  notice,
  onChange,
  onSubmit,
}: Props) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSaving) onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className={PANEL}>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-accent">科目名</span>
        <input
          type="text"
          list="card-subjects"
          value={draft.subject}
          onChange={(e) => onChange({ ...draft, subject: e.target.value })}
          readOnly={isSaving}
          placeholder="例：線形代数"
          autoComplete="off"
          className={TEXT_INPUT}
        />
        <datalist id="card-subjects">
          {subjects.map((subject) => (
            <option key={subject} value={subject} />
          ))}
        </datalist>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-accent">問題</span>
        <textarea
          value={draft.question}
          onChange={(e) => onChange({ ...draft, question: e.target.value })}
          readOnly={isSaving}
          rows={3}
          placeholder="例：Av = λv の λ を何と呼ぶ？"
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
          placeholder="例：固有値"
          autoComplete="off"
          className={TEXT_INPUT}
        />
      </label>

      {error !== null && (
        <p role="alert" className={ALERT}>
          {error}
        </p>
      )}
      <p role="status" className="empty:hidden text-accent">
        {notice}
      </p>

      <button type="submit" disabled={isSaving} className={PRIMARY_BUTTON}>
        {isSaving ? "保存しています…" : `${terms.addCard}（登録）`}
      </button>
    </form>
  );
}
