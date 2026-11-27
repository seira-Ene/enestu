import { useState, type ChangeEvent } from "react";
import {
  buildAiPrompt,
  MAX_IMPORT_BYTES,
  MAX_IMPORT_CARDS,
  MAX_IMPORT_LENGTH,
  parseImportedCards,
  type ImportCandidate,
} from "@/domain/card-import";
import { generateCards, MAX_GENERATE_LENGTH } from "@/domain/card-generator";
import { generateAiCards } from "@/lib/ai-api";
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
import { AiSourcePicker, type AiPhoto } from "./AiSourcePicker";
import { ImportReview, type ReviewItem } from "./ImportReview";
import { ModeTabs } from "./ModeTabs";

/** 書式どおりに読むか、普通の文章から作るか、AIで作るか。 */
const METHODS = [
  { id: "format", label: "書式どおり" },
  { id: "generate", label: "文章から（AIなし）" },
  { id: "ai", label: "AIで作る" },
] as const;
type Method = (typeof METHODS)[number]["id"];

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
  const [method, setMethod] = useState<Method>("format");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [items, setItems] = useState<readonly ReviewItem[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** コピーできない環境で、手で選べるように表示する指示文。 */
  const [manualPrompt, setManualPrompt] = useState<string | null>(null);
  /** AIに送る写真（縮めたもの）。メモリにだけ置き、保存しない。 */
  const [photos, setPhotos] = useState<readonly AiPhoto[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  /** AIで作れなかったとき、AIなしで作り直すボタンを出す。 */
  const [aiFailed, setAiFailed] = useState(false);

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

  function handleParse(by: Method = method) {
    setNotice(null);
    setAiFailed(false);
    if (by === "ai") {
      void handleAi();
      return;
    }
    if (text.trim() === "") {
      setError("文章を貼るか、ファイルを選んでください。");
      return;
    }
    const limit = by === "generate" ? MAX_GENERATE_LENGTH : MAX_IMPORT_LENGTH;
    if (text.length > limit) {
      setError(
        `一度に読み取れるのは${limit.toLocaleString("ja-JP")}文字までです。分けて取り込んでください。`,
      );
      return;
    }
    const result =
      by === "generate"
        ? generateCards(text, existing)
        : parseImportedCards(text, existing);
    if (result.candidates.length === 0) {
      setError(
        result.duplicateCount > 0
          ? "読み取れた問題は、すべて登録済みでした。"
          : by === "generate"
            ? "問題にできる文が見つかりませんでした。下の「作れる形」を確認してください。"
            : "問題を読み取れませんでした。下の「読み取れる形」を確認してください。",
      );
      return;
    }
    present(
      result,
      by === "generate"
        ? `${summaryText(result)}簡易生成（AIなし）です。元の文と見比べて確かめてください。`
        : summaryText(result),
    );
  }

  async function handleAi() {
    setIsGenerating(true);
    setError(null);
    const result = await generateAiCards(
      text,
      photos.map((photo) => photo.image),
    );
    setIsGenerating(false);
    if (!result.ok) {
      setError(result.error);
      // 文章があれば、AIなしで作り直せるようにする。
      setAiFailed(text.trim() !== "");
      return;
    }
    present(
      { candidates: result.value },
      `${result.value.length}枚の候補をAI（Gemini）が作りました。AIはまちがえることがあります。資料と見比べて確かめてください。`,
    );
  }

  /** 候補を確認画面に出す。文章から作った候補には、元の文を添える。 */
  function present(
    result: {
      readonly candidates: readonly (ImportCandidate & { readonly source?: string })[];
    },
    message: string,
  ) {
    setError(null);
    setItems(
      result.candidates.map((candidate) => ({
        id: crypto.randomUUID(),
        subject: candidate.subject ?? subject.trim(),
        question: candidate.question,
        answer: candidate.answer,
        ...(candidate.source === undefined || candidate.source === ""
          ? {}
          : { source: candidate.source }),
      })),
    );
    setNotice(message);
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
      <ModeTabs
        label="取り込みかた"
        modes={METHODS}
        current={method}
        onChange={(next) => {
          setMethod(next);
          setError(null);
          setNotice(null);
        }}
      />
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

      <div className="flex flex-col gap-2" hidden={method !== "format"}>
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
          placeholder={
            method === "format"
              ? "Q: 首都は？\nA: 東京"
              : "例：光のエネルギーを使って養分をつくるはたらきを光合成という。"
          }
          className={TEXT_INPUT}
        />
      </label>

      {method === "ai" && <AiSourcePicker photos={photos} onChange={setPhotos} />}

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

      {method === "ai" ? null : method === "generate" ? (
        <details className="text-sm">
          <summary className="cursor-pointer">作れる形</summary>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
            <li>「〜を光合成という」「〜と呼ぶ」のような文</li>
            <li>「気孔とは、葉のすきまである。」のような文（1行に何文あってもよい）</li>
            <li>用語集の形「蒸散：水が水蒸気となって出ること」</li>
            <li>**水** や【道管】のように強調した語（穴埋めにします）</li>
            <li>AIは使わない簡易生成です。1回に{MAX_IMPORT_CARDS}枚まで</li>
          </ul>
        </details>
      ) : (
        <details className="text-sm">
          <summary className="cursor-pointer">読み取れる形</summary>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
            <li>Q: 問題　A: 答え（行を分ける）</li>
            <li>問題,答え　または　科目,問題,答え（タブや表も可）</li>
            <li>「固有値とは、行列の拡大率である。」のような文</li>
            <li>1回に{MAX_IMPORT_CARDS}枚まで</li>
          </ul>
        </details>
      )}

      {error !== null && (
        <p role="alert" className={ALERT}>
          {error}
        </p>
      )}
      {aiFailed && (
        <button
          type="button"
          onClick={() => {
            setMethod("generate");
            handleParse("generate");
          }}
          className={SECONDARY_BUTTON}
        >
          AIなしで作る
        </button>
      )}
      {status}
      <button
        type="button"
        onClick={() => handleParse()}
        disabled={isGenerating}
        className={PRIMARY_BUTTON}
      >
        {isGenerating ? "AIが作っています…" : "候補をつくる"}
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
