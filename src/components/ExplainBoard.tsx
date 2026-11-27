import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import {
  rankExplanation,
  suggestTerm,
  understandingPercent,
  type ExplainTerm,
  type ExplanationLog,
  type ExplanationRank,
} from "@/domain/explanation";
import {
  MAX_EXPLANATION_LENGTH,
  parseExplanationBody,
} from "@/domain/explanation-input";
import {
  fetchExplanations,
  fetchTerms,
  submitExplanation,
} from "@/lib/explain-api";
import { useRemote } from "@/lib/use-remote";
import { ExplanationHistory } from "./ExplanationHistory";
import { ExplanationResult } from "./ExplanationResult";
import {
  ALERT,
  HEADING,
  PANEL,
  PRIMARY_BUTTON,
  TEXT_INPUT,
} from "./form-styles";

type Props = {
  /** 世界線での、言語化の呼び方。 */
  title: string;
  /** 結果が出たとき。書き直すときは null。 */
  onRank: (rank: ExplanationRank | null) => void;
};

/** 用語を自分の言葉で説明し、足りない観点を知る。 */
export function ExplainBoard({ title, onRank }: Props) {
  const terms = useRemote(fetchTerms);
  const logs = useRemote(fetchExplanations);
  /** 選んだ用語。null なら、おすすめの用語を使う。 */
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [result, setResult] = useState<ExplanationLog | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 同じ内容の送り直しなら同じIDを使い、二重に記録しない。 */
  const lastAttempt = useRef<{
    id: string;
    termId: string;
    body: string;
    explainedAt: string;
  } | null>(null);

  const all = terms.data ?? [];
  const isReady = terms.data !== null && logs.data !== null;
  const term =
    all.find(({ id }) => id === chosenId) ??
    suggestTerm(all, logs.data ?? []);

  function choose(id: string | null) {
    setChosenId(id);
    setError(null);
    // 書きかけは残し、判定が済んだ説明だけを片付ける。
    if (result === null) return;
    setResult(null);
    setBody("");
    onRank(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving || term === null) return;
    const text = parseExplanationBody(body);
    if (!text.ok) {
      setError(text.error);
      return;
    }
    const last = lastAttempt.current;
    const attempt =
      last !== null && last.termId === term.id && last.body === text.value
        ? last
        : {
            id: crypto.randomUUID(),
            termId: term.id,
            body: text.value,
            explainedAt: new Date().toISOString(),
          };
    lastAttempt.current = attempt;
    // 記録が増えるとおすすめが変わるので、今の用語に固定する。
    setChosenId(term.id);
    setIsSaving(true);
    setError(null);
    const saved = await submitExplanation(attempt);
    setIsSaving(false);
    if (!saved.ok) {
      setError(`${saved.error}（書いた説明は残っています）`);
      return;
    }
    lastAttempt.current = null;
    setResult(saved.value);
    onRank(
      rankExplanation(
        understandingPercent(
          saved.value.totalCount,
          saved.value.missing.length,
        ),
      ),
    );
    await logs.reload();
  }

  const loadError = terms.error ?? logs.error;

  return (
    <>
      <section className={PANEL} aria-labelledby="explain-title">
        <h2 id="explain-title" className={HEADING}>
          {title}（言葉で説明する）
        </h2>
        {loadError !== null && (
          <div role="alert" className="flex flex-col items-start gap-2">
            <p>{loadError}</p>
            <button
              type="button"
              onClick={() => void Promise.all([terms.reload(), logs.reload()])}
              className="underline"
            >
              もう一度読み込む
            </button>
          </div>
        )}
        {!isReady && loadError === null && <p>読み込んでいます…</p>}
        {isReady && term === null && (
          <p>
            まだ用語がありません。
            <Link href="/cards" className="text-primary underline">
              カードの画面の「用語」で登録する
            </Link>
          </p>
        )}
        {isReady && term !== null && (
          <>
            <TermPicker
              terms={all}
              current={term}
              isDisabled={isSaving}
              onChoose={choose}
            />
            {result === null ? (
              <form
                onSubmit={(event) => void handleSubmit(event)}
                className="flex flex-col gap-4"
              >
                <label className="flex flex-col gap-1">
                  <span className="break-words">
                    「{term.term}」を、自分の言葉で説明してください。
                  </span>
                  <span className="text-xs opacity-80">
                    資料を見ずに、{MAX_EXPLANATION_LENGTH}
                    文字まで。登録した観点は、判定するまで出しません。
                  </span>
                  <textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    readOnly={isSaving}
                    rows={6}
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
                  disabled={isSaving}
                  className={PRIMARY_BUTTON}
                >
                  {isSaving ? "判定しています…" : "判定する"}
                </button>
              </form>
            ) : (
              <ExplanationResult
                term={term}
                log={result}
                onRewrite={() => {
                  setResult(null);
                  onRank(null);
                }}
                onNext={() =>
                  choose(suggestTerm(all, logs.data ?? [], term.id)?.id ?? null)
                }
              />
            )}
          </>
        )}
      </section>
      {isReady && logs.data !== null && (
        <ExplanationHistory logs={logs.data} terms={all} />
      )}
    </>
  );
}

function TermPicker({
  terms,
  current,
  isDisabled,
  onChoose,
}: {
  terms: readonly ExplainTerm[];
  current: ExplainTerm;
  isDisabled: boolean;
  onChoose: (id: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-accent">説明する用語</span>
      <select
        value={current.id}
        disabled={isDisabled}
        onChange={(event) => onChoose(event.target.value)}
        className={TEXT_INPUT}
      >
        {terms.map(({ id, subject, term }) => (
          <option key={id} value={id}>
            {subject}：{term}
          </option>
        ))}
      </select>
    </label>
  );
}
