import { useState, type FormEvent } from "react";
import { AI_DAILY_LIMIT, parseAiKeyInput } from "@/domain/ai-key";
import { deleteAiKey, fetchAiKey, saveAiKey } from "@/lib/ai-key-api";
import { useRemote } from "@/lib/use-remote";
import {
  ALERT,
  HEADING,
  PANEL,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
  TEXT_INPUT,
} from "./form-styles";

/** AIのAPIキー（BYOK）を登録する欄。ログインした人だけに出す。 */
export function AiKeyPanel() {
  const remote = useRemote(fetchAiKey);
  const [key, setKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = parseAiKeyInput({ provider: "gemini", key });
    if (!input.ok) {
      setError(input.error);
      setNotice(null);
      return;
    }
    setIsSaving(true);
    setError(null);
    setNotice(null);
    const result = await saveAiKey(input.value.key);
    // 保存できてもできなくても、キーは画面に残さない。
    setKey("");
    setIsSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice("キーを保存しました。");
    await remote.reload();
  }

  async function handleDelete() {
    if (!window.confirm("保存したキーを削除しますか？")) return;
    setIsSaving(true);
    setError(null);
    setNotice(null);
    const result = await deleteAiKey();
    setIsSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice("キーを削除しました。");
    await remote.reload();
  }

  const saved = remote.data?.saved ?? null;

  return (
    <section aria-labelledby="ai-key-title" className={PANEL}>
      <h2 id="ai-key-title" className={HEADING}>
        AIの設定（Gemini）
      </h2>
      <div className={`${ALERT} flex flex-col gap-2 text-sm`}>
        <p className="font-bold">18歳以上の方が対象です。</p>
        <p>
          キーの持ち主が、Google の Gemini API の利用規約に同意したうえで使ってください。無料枠では、送った内容が
          Google の製品の改善に使われ、人が読む場合があります。個人情報や、送ってよいか分からない資料は送らないでください。
        </p>
      </div>
      {remote.error !== null && (
        <p role="alert" className="text-sm">
          {remote.error}
        </p>
      )}
      {remote.data === null && remote.error === null && <p>読み込んでいます…</p>}
      {remote.data !== null && (
        <p className="text-sm">
          {saved === null ? "キーはまだ登録していません。" : `登録済み：…${saved.last4}`}
        </p>
      )}
      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-accent">
            {saved === null ? "Gemini のAPIキー" : "新しいキーに替える"}
          </span>
          <input
            type="password"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder="AIza…"
            className={TEXT_INPUT}
          />
        </label>
        {error !== null && (
          <p role="alert" className={ALERT}>
            {error}
          </p>
        )}
        <p role="status" className="text-sm text-accent empty:hidden">
          {notice}
        </p>
        <button type="submit" disabled={isSaving} className={PRIMARY_BUTTON}>
          キーを保存
        </button>
      </form>
      {saved !== null && (
        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={isSaving}
          className={SECONDARY_BUTTON}
        >
          キーを削除
        </button>
      )}
      <ul className="flex list-disc flex-col gap-1 pl-5 text-xs opacity-80">
        <li>
          キーは{" "}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Google AI Studio
          </a>{" "}
          で作れます。
        </li>
        <li>キーは暗号化して保存し、画面には末尾4文字だけを出します。</li>
        <li>AIを使えるのは、1日{AI_DAILY_LIMIT}回までです。</li>
      </ul>
    </section>
  );
}
