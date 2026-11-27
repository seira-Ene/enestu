import { useState, type FormEvent } from "react";
import type { ExplainTerm } from "@/domain/explanation";
import { parseTermDraft, splitKeywordLines } from "@/domain/explanation-input";
import { deleteTerm, updateTerm } from "@/lib/explain-api";
import type { Remote } from "@/lib/use-remote";
import {
  ALERT,
  HEADING,
  ITEM,
  PANEL,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
} from "./form-styles";
import { TermFields, type TermText } from "./TermFields";

type Props = {
  terms: Remote<ExplainTerm[]>;
  subjects: readonly string[];
};

type Editing = { readonly id: string; readonly text: TermText };

export function TermList({ terms, subjects }: Props) {
  const { data, error, reload } = terms;
  const [editing, setEditing] = useState<Editing | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving || editing === null) return;
    const { id, text } = editing;
    const draft = parseTermDraft({
      ...text,
      keywords: splitKeywordLines(text.keywords),
    });
    if (!draft.ok) {
      setMessage(draft.error);
      return;
    }
    setIsSaving(true);
    setMessage(null);
    const result = await updateTerm(id, draft.value);
    if (result.ok) {
      setEditing(null);
      await reload();
    } else {
      setMessage(result.error);
    }
    setIsSaving(false);
  }

  async function handleDelete(id: string) {
    if (
      !window.confirm(
        "この用語を削除しますか？\n説明の記録は残りますが、集計からは外れます。",
      )
    ) {
      return;
    }
    setIsSaving(true);
    setMessage(null);
    const result = await deleteTerm(id);
    if (result.ok) await reload();
    else setMessage(result.error);
    setIsSaving(false);
  }

  return (
    <section className={PANEL} aria-labelledby="term-list-title">
      <h2 id="term-list-title" className={HEADING}>
        用語{data !== null && `（${data.length}個）`}
      </h2>
      {error !== null && (
        <div role="alert" className="flex flex-col items-start gap-2">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void reload()}
            className="underline"
          >
            もう一度読み込む
          </button>
        </div>
      )}
      {message !== null && (
        <p role="alert" className={ALERT}>
          {message}
        </p>
      )}
      {data === null && error === null && <p>読み込んでいます…</p>}
      {data !== null && data.length === 0 && (
        <p className="opacity-80">まだ用語がありません。</p>
      )}
      {data !== null && data.length > 0 && (
        <ul className="flex flex-col gap-2 xl:grid xl:grid-cols-2 xl:items-start">
          {data.map((item) => (
            <li key={item.id} className={ITEM}>
              {editing?.id === item.id ? (
                <form
                  onSubmit={(event) => void handleSave(event)}
                  className="flex flex-col gap-3"
                >
                  <TermFields
                    text={editing.text}
                    subjects={subjects}
                    isSaving={isSaving}
                    onChange={(text) => setEditing({ id: item.id, text })}
                  />
                  <button
                    type="submit"
                    disabled={isSaving}
                    className={PRIMARY_BUTTON}
                  >
                    {isSaving ? "保存しています…" : "変更を保存"}
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => {
                      setEditing(null);
                      setMessage(null);
                    }}
                    className={SECONDARY_BUTTON}
                  >
                    やめる
                  </button>
                </form>
              ) : (
                <TermRow
                  item={item}
                  isDisabled={isSaving}
                  onEdit={() => {
                    setMessage(null);
                    setEditing({
                      id: item.id,
                      text: {
                        subject: item.subject,
                        term: item.term,
                        keywords: item.keywords.join("\n"),
                      },
                    });
                  }}
                  onDelete={() => void handleDelete(item.id)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TermRow({
  item,
  isDisabled,
  onEdit,
  onDelete,
}: {
  item: ExplainTerm;
  isDisabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <p className="break-words text-sm text-accent">{item.subject}</p>
      <p className="break-words font-bold">{item.term}</p>
      <details className="mt-1">
        <summary className="cursor-pointer text-sm opacity-80">
          観点を見る（{item.keywords.length}個）
        </summary>
        <ul className="list-disc pl-5">
          {item.keywords.map((keyword) => (
            <li key={keyword} className="break-words">
              {keyword}
            </li>
          ))}
        </ul>
      </details>
      <div className="mt-2 flex justify-end gap-4 text-sm">
        <button
          type="button"
          disabled={isDisabled}
          onClick={onEdit}
          className="underline disabled:opacity-50"
        >
          編集
        </button>
        <button
          type="button"
          disabled={isDisabled}
          onClick={onDelete}
          className="underline disabled:opacity-50"
        >
          削除
        </button>
      </div>
    </>
  );
}
