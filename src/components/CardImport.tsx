import { useState, type ChangeEvent } from "react";
import {
  buildAiPrompt,
  MAX_IMPORT_BYTES,
  MAX_IMPORT_CARDS,
  MAX_IMPORT_LENGTH,
  parseImportedCards,
} from "@/domain/card-import";
import type { QuizCard } from "@/domain/quiz";
import { saveCards } from "@/lib/quiz-api";
import { readTextFile } from "@/lib/read-text-file";
import type { QuizTerms } from "@/themes/types";
import {
  ALERT,
  PANEL,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
  TEXT_INPUT,
} from "./form-styles";
import { ImportReview, type ReviewItem } from "./ImportReview";

type Props = {
  terms: QuizTerms;
  subjects: readonly string[];
  existing: readonly QuizCard[];
  onRegistered: () => Promise<void>;
};

/** 文章やファイルから候補を作り、確認してからまとめて登録する。 */
export function CardImport({
  terms,
  subjects,
  existing,
  onRegistered,
}: Props) {
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [items, setItems] = useState<readonly ReviewItem[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** コピーできない環境で、手で選べるように表示する指示文。 */
  const [manualPrompt, setManualPrompt] = useState<string | null>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    if (file === undefined) return;
    setNotice(null);
    if (file.size > MAX_IMPORT_BYTES) {
      setError(
        `ファイルは${Math.floor(MAX_IMPORT_BYTES / 1000)}KBまでです。分けて取り込んでください。`,
      );
    } else {
      const result = await readTextFile(file);
      if (result.ok) {
        setText(result.value);
        setError(null);
      } else {
        setError(result.error);
      }
    }
    // 同じファイルを選び直せるようにする。
    input.value = "";
  }

  async function handleCopyPrompt() {
    const prompt = buildAiPrompt(subject);
    setError(null);
    try {
      await navigator.clipboard.writeText(prompt);
      setManualPrompt(null);
      setNotice(
        "指示文をコピーしました。お使いのAIアプリに、資料と一緒に貼ってください。",
      );
    } catch {
      setManualPrompt(prompt);
      setNotice(null);
    }
  }

  function handleParse() {
    setNotice(null);
    if (text.trim() === "") {
      setError("文章を貼るか、ファイルを選んでください。");
      return;
    }
    if (text.length > MAX_IMPORT_LENGTH) {
      setError(
        `一度に読み取れるのは${MAX_IMPORT_LENGTH.toLocaleString("ja-JP")}文字までです。分けて取り込んでください。`,
      );
      return;
    }
    const result = parseImportedCards(text, existing);
    if (result.candidates.length === 0) {
      setError(
        result.duplicateCount > 0
          ? "読み取れた問題は、すべて登録済みでした。"
          : "問題を読み取れませんでした。下の「読み取れる形」を確認してください。",
      );
      return;
    }
    setError(null);
    setItems(
      result.candidates.map((candidate) => ({
        id: crypto.randomUUID(),
        subject: candidate.subject ?? subject.trim(),
        question: candidate.question,
        answer: candidate.answer,
      })),
    );
    setNotice(summaryText(result));
  }

  async function handleRegister(cards: readonly QuizCard[]) {
    setIsSaving(true);
    setError(null);
    const result = await saveCards(cards);
    setIsSaving(false);
    if (!result.ok) {
      setError(`${result.error}（候補は残っています）`);
      return;
    }
    setItems(null);
    setText("");
    setNotice(`${cards.length}枚を登録しました。`);
    await onRegistered();
  }

  const status = (
    <p role="status" className="text-accent empty:hidden">
      {notice}
    </p>
  );

  if (items !== null) {
    return (
      <section className={PANEL}>
        {status}
        <ImportReview
          terms={terms}
          items={items}
          isSaving={isSaving}
          error={error}
          onChange={setItems}
          onRegister={(cards) => void handleRegister(cards)}
          onCancel={() => {
            setItems(null);
            setNotice(null);
            setError(null);
          }}
        />
      </section>
    );
  }

  return (
    <section className={PANEL}>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-accent">科目名（全部に付けます）</span>
        <input
          type="text"
          list="import-subjects"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="例：線形代数"
          autoComplete="off"
          className={TEXT_INPUT}
        />
        <datalist id="import-subjects">
          {subjects.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </label>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => void handleCopyPrompt()}
          className={SECONDARY_BUTTON}
        >
          AI用の指示文をコピー
        </button>
        <p className="text-sm opacity-80">
          お使いのAIアプリに資料と一緒に貼り、返ってきた文章を下に貼り付けてください。資料をAIに渡してよいかは、授業などの決まりを確認してください。
        </p>
        {manualPrompt !== null && (
          <label className="flex flex-col gap-1">
            <span className="text-sm text-accent">
              自動でコピーできませんでした。選んでコピーしてください。
            </span>
            <textarea
              readOnly
              rows={6}
              value={manualPrompt}
              className={TEXT_INPUT}
            />
          </label>
        )}
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-accent">文章を貼り付け</span>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={6}
          placeholder={"Q: 首都は？\nA: 東京"}
          className={TEXT_INPUT}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-accent">
          またはファイルを選ぶ（.txt .md .csv）
        </span>
        <input
          type="file"
          accept=".txt,.md,.csv,text/plain,text/markdown,text/csv"
          onChange={(event) => void handleFile(event)}
          className="text-sm file:mr-3 file:rounded-[var(--decor-button-radius)] file:border-2 file:border-accent file:bg-background file:px-3 file:py-2 file:text-text"
        />
        <span className="text-sm opacity-80">
          ファイルはこの端末の中で読み、送信しません。
        </span>
      </label>

      <details className="text-sm">
        <summary className="cursor-pointer">読み取れる形</summary>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
          <li>Q: 問題　A: 答え（行を分ける）</li>
          <li>問題,答え　または　科目,問題,答え（タブや表も可）</li>
          <li>「固有値とは、行列の拡大率である。」のような文</li>
          <li>1回に{MAX_IMPORT_CARDS}枚まで</li>
        </ul>
      </details>

      {error !== null && (
        <p role="alert" className={ALERT}>
          {error}
        </p>
      )}
      {status}
      <button type="button" onClick={handleParse} className={PRIMARY_BUTTON}>
        候補をつくる
      </button>
    </section>
  );
}

function summaryText(result: {
  readonly candidates: readonly unknown[];
  readonly duplicateCount: number;
  readonly overflowCount: number;
}): string {
  const parts = [`${result.candidates.length}枚の候補を読み取りました。`];
  if (result.duplicateCount > 0) {
    parts.push(`重複した${result.duplicateCount}枚は除きました。`);
  }
  if (result.overflowCount > 0) {
    parts.push(
      `上限を超えた${result.overflowCount}枚は、次の回に取り込んでください。`,
    );
  }
  return parts.join("");
}
