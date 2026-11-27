import { useRef, useState, type FormEvent } from "react";
import { parseTermDraft, splitKeywordLines } from "@/domain/explanation-input";
import { saveTerm } from "@/lib/explain-api";
import { ALERT, HEADING, PANEL, PRIMARY_BUTTON } from "./form-styles";
import { TermFields, type TermText } from "./TermFields";

const EMPTY_TEXT: TermText = { subject: "", term: "", keywords: "" };

type Props = {
  subjects: readonly string[];
  onSaved: () => Promise<void>;
};

/** 説明する用語を登録する。 */
export function TermForm({ subjects, onSaved }: Props) {
  const [text, setText] = useState(EMPTY_TEXT);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** 同じ内容の送り直しなら同じIDを使い、二重登録を防ぐ。 */
  const lastAttempt = useRef<{ content: string; id: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    setNotice(null);
    const draft = parseTermDraft({
      ...text,
      keywords: splitKeywordLines(text.keywords),
    });
    if (!draft.ok) {
      setError(draft.error);
      return;
    }
    const content = JSON.stringify(draft.value);
    if (lastAttempt.current?.content !== content) {
      lastAttempt.current = { content, id: crypto.randomUUID() };
    }
    setIsSaving(true);
    setError(null);
    const result = await saveTerm({
      id: lastAttempt.current.id,
      ...draft.value,
    });
    setIsSaving(false);
    if (!result.ok) {
      setError(`${result.error}（入力内容は残っています）`);
      return;
    }
    lastAttempt.current = null;
    setText({ ...EMPTY_TEXT, subject: draft.value.subject });
    setNotice("登録しました。テストの画面の「言語化」で説明できます。");
    await onSaved();
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className={PANEL}
      aria-labelledby="term-form-title"
    >
      <h2 id="term-form-title" className={HEADING}>
        言葉で説明したい用語
      </h2>
      <TermFields
        text={text}
        subjects={subjects}
        isSaving={isSaving}
        onChange={(next) => {
          setText(next);
          setNotice(null);
        }}
      />
      {error !== null && (
        <p role="alert" className={ALERT}>
          {error}
        </p>
      )}
      <p role="status" className="empty:hidden text-accent">
        {notice}
      </p>
      <button type="submit" disabled={isSaving} className={PRIMARY_BUTTON}>
        {isSaving ? "保存しています…" : "用語を登録"}
      </button>
    </form>
  );
}
