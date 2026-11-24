import { useState } from "react";
import type { QuizCard } from "@/domain/quiz";
import { parseCardDraft } from "@/domain/quiz-input";
import { deleteCard, updateCard } from "@/lib/quiz-api";
import type { Remote } from "@/lib/use-remote";
import type { QuizTerms } from "@/themes/types";
import { CardEditor, type CardDraft } from "./CardEditor";
import { ALERT, HEADING, ITEM, PANEL } from "./form-styles";

type Props = {
  terms: QuizTerms;
  cards: Remote<QuizCard[]>;
};

type Editing = { readonly id: string; readonly draft: CardDraft };

export function CardList({ terms, cards }: Props) {
  const { data, error, reload } = cards;
  const [editing, setEditing] = useState<Editing | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave({ id, draft }: Editing) {
    const parsed = parseCardDraft(draft);
    if (!parsed.ok) {
      setMessage(parsed.error);
      return;
    }
    setIsSaving(true);
    setMessage(null);
    const result = await updateCard(id, parsed.value);
    setIsSaving(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setEditing(null);
    await reload();
  }

  async function handleDelete(id: string) {
    if (
      !window.confirm(
        "このカードを削除しますか？\n解答の記録は残りますが、集計からは外れます。",
      )
    ) {
      return;
    }
    setIsSaving(true);
    setMessage(null);
    const result = await deleteCard(id);
    setIsSaving(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    await reload();
  }

  return (
    <section className={PANEL}>
      <h2 className={HEADING}>
        {terms.card}
        {data !== null && `（${data.length}枚）`}
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
      {message !== null && editing === null && (
        <p role="alert" className={ALERT}>
          {message}
        </p>
      )}
      {data === null && error === null && <p>読み込んでいます…</p>}
      {data !== null && data.length === 0 && (
        <p className="opacity-80">まだカードがありません。</p>
      )}
      {data !== null && data.length > 0 && (
        <ul className="flex flex-col gap-2">
          {data.map((card) => (
            <li key={card.id} className={ITEM}>
              {editing?.id === card.id ? (
                <CardEditor
                  draft={editing.draft}
                  isSaving={isSaving}
                  error={message}
                  onChange={(draft) => setEditing({ id: card.id, draft })}
                  onSave={() => void handleSave(editing)}
                  onCancel={() => {
                    setEditing(null);
                    setMessage(null);
                  }}
                />
              ) : (
                <CardRow
                  card={card}
                  disabled={isSaving}
                  onEdit={() => {
                    const { subject, question, answer } = card;
                    setMessage(null);
                    setEditing({
                      id: card.id,
                      draft: { subject, question, answer },
                    });
                  }}
                  onDelete={() => void handleDelete(card.id)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CardRow({
  card,
  disabled,
  onEdit,
  onDelete,
}: {
  card: QuizCard;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <p className="break-words text-sm text-accent">{card.subject}</p>
      <p className="break-words whitespace-pre-wrap font-bold">
        {card.question}
      </p>
      <details className="mt-1">
        <summary className="cursor-pointer text-sm opacity-80">
          答えを見る
        </summary>
        <p className="break-words">{card.answer}</p>
      </details>
      <div className="mt-2 flex justify-end gap-4 text-sm">
        <button
          type="button"
          onClick={onEdit}
          disabled={disabled}
          className="px-1 py-1 underline disabled:opacity-50"
        >
          編集
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          className="px-1 py-1 underline disabled:opacity-50"
        >
          削除
        </button>
      </div>
    </>
  );
}
