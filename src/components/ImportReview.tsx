import type { QuizCard } from "@/domain/quiz";
import { parseCardDraft } from "@/domain/quiz-input";
import type { QuizTerms } from "@/themes/types";
import {
  ALERT,
  ITEM,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
  TEXT_INPUT,
} from "./form-styles";

/** 登録前の候補。検証を通るまではカードとして扱わない。source は、候補を作った元の文。 */
export type ReviewItem = QuizCard & { readonly source?: string };

type Props = {
  terms: QuizTerms;
  items: readonly ReviewItem[];
  isSaving: boolean;
  error: string | null;
  onChange: (items: readonly ReviewItem[]) => void;
  onRegister: (cards: readonly QuizCard[]) => void;
  onCancel: () => void;
};

/** 読み取った候補を、登録する前に確認・修正する。 */
export function ImportReview({
  terms,
  items,
  isSaving,
  error,
  onChange,
  onRegister,
  onCancel,
}: Props) {
  const checked = items.map((item) => ({ item, parsed: parseCardDraft(item) }));
  const invalidCount = checked.filter(({ parsed }) => !parsed.ok).length;
  const canRegister = items.length > 0 && invalidCount === 0 && !isSaving;

  function update(id: string, values: Partial<Omit<ReviewItem, "id">>) {
    onChange(
      items.map((item) =>
        // 直した候補は別のカードとして送る。同じIDの再送は無視されるため。
        item.id === id ? { ...item, ...values, id: crypto.randomUUID() } : item,
      ),
    );
  }

  function handleRegister() {
    const cards = checked.flatMap(({ item, parsed }) =>
      parsed.ok ? [{ id: item.id, ...parsed.value }] : [],
    );
    if (canRegister) onRegister(cards);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        内容を確かめて、まちがいがあれば直してください。AIが作った問題は、資料と合っているかも確認してください。
      </p>
      <ol className="flex flex-col gap-3">
        {checked.map(({ item, parsed }, index) => (
          // 直すとIDが変わるため、入力欄が作り直されないよう位置をキーにする。
          <li key={index} className={`${ITEM} flex flex-col gap-2`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-accent">候補 {index + 1}</span>
              <button
                type="button"
                disabled={isSaving}
                onClick={() =>
                  onChange(items.filter((other) => other.id !== item.id))
                }
                className="px-1 py-1 text-sm underline disabled:opacity-50"
              >
                外す
              </button>
            </div>
            {item.source !== undefined && (
              <p className="text-xs break-words opacity-80">元の文：{item.source}</p>
            )}
            <input
              type="text"
              aria-label={`候補${index + 1}の科目名`}
              value={item.subject}
              readOnly={isSaving}
              placeholder="科目名"
              autoComplete="off"
              onChange={(e) => update(item.id, { subject: e.target.value })}
              className={TEXT_INPUT}
            />
            <textarea
              aria-label={`候補${index + 1}の問題`}
              value={item.question}
              readOnly={isSaving}
              rows={2}
              onChange={(e) => update(item.id, { question: e.target.value })}
              className={TEXT_INPUT}
            />
            <input
              type="text"
              aria-label={`候補${index + 1}の答え`}
              value={item.answer}
              readOnly={isSaving}
              autoComplete="off"
              onChange={(e) => update(item.id, { answer: e.target.value })}
              className={TEXT_INPUT}
            />
            {!parsed.ok && (
              <p role="alert" className="text-sm font-bold text-primary">
                ▲ {parsed.error}
              </p>
            )}
          </li>
        ))}
      </ol>
      {items.length === 0 && <p>候補がなくなりました。</p>}
      {error !== null && (
        <p role="alert" className={ALERT}>
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={handleRegister}
        disabled={!canRegister}
        className={PRIMARY_BUTTON}
      >
        {registerLabel(terms, items.length, invalidCount, isSaving)}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={isSaving}
        className={SECONDARY_BUTTON}
      >
        取り込みをやめる
      </button>
    </div>
  );
}

function registerLabel(
  terms: QuizTerms,
  count: number,
  invalidCount: number,
  isSaving: boolean,
): string {
  if (isSaving) return "保存しています…";
  if (invalidCount > 0) return `あと${invalidCount}枚を直してください`;
  return `${terms.addCard}（${count}枚を登録）`;
}
