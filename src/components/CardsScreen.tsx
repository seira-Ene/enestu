"use client";

import { useRef, useState } from "react";
import { listSubjects } from "@/domain/quiz";
import { parseCardDraft } from "@/domain/quiz-input";
import { fetchCards, saveCard } from "@/lib/quiz-api";
import { fetchTodayLogs } from "@/lib/study-log-api";
import { useRemote } from "@/lib/use-remote";
import type { CardDraft } from "./CardEditor";
import { CardForm } from "./CardForm";
import { CardImport } from "./CardImport";
import { CardList } from "./CardList";
import { ScreenHeader } from "./ScreenHeader";
import { useWorld } from "./WorldProvider";

const EMPTY_DRAFT: CardDraft = { subject: "", question: "", answer: "" };

const MODES = [
  { id: "bulk", label: "まとめて" },
  { id: "single", label: "1枚ずつ" },
] as const;

type Mode = (typeof MODES)[number]["id"];

export function CardsScreen() {
  const { theme } = useWorld();
  const cards = useRemote(fetchCards);
  const todayLogs = useRemote(fetchTodayLogs);
  const [mode, setMode] = useState<Mode>("bulk");
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** 直前に送ろうとした内容とそのID。 */
  const lastAttempt = useRef<{ content: string; id: string } | null>(null);

  function handleChange(next: CardDraft) {
    setDraft(next);
    setNotice(null);
  }

  async function handleSubmit() {
    const parsed = parseCardDraft(draft);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    // 同じ内容の再送なら同じIDを使い、二重登録を防ぐ。
    // 内容を直したら新しいIDにする（同じIDだと修正が無視されるため）。
    const content = JSON.stringify(parsed.value);
    if (lastAttempt.current?.content !== content) {
      lastAttempt.current = { content, id: crypto.randomUUID() };
    }
    const { id } = lastAttempt.current;

    setIsSaving(true);
    setError(null);
    const result = await saveCard({ id, ...parsed.value });
    setIsSaving(false);
    if (!result.ok) {
      setError(`${result.error}（入力内容は残っています）`);
      return;
    }
    lastAttempt.current = null;
    setDraft({ ...EMPTY_DRAFT, subject: parsed.value.subject });
    setNotice("登録しました。");
    await cards.reload();
  }

  const subjects = listSubjects([
    ...(cards.data ?? []),
    ...(todayLogs.data ?? []),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-6">
      <ScreenHeader title={theme.terms.navCards} subtitle="カードの登録" />
      <div role="group" aria-label="登録のしかた" className="panel grid grid-cols-2 gap-2 p-2">
        {MODES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={mode === id}
            onClick={() => setMode(id)}
            className={`font-display rounded-[var(--decor-button-radius)] px-2 py-2 ${
              mode === id ? "bg-primary text-background" : "text-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {/* 切り替えても書きかけが消えないよう、隠すだけにする。 */}
      <div hidden={mode !== "bulk"}>
        <CardImport
          terms={theme.quiz.terms}
          subjects={subjects}
          existing={cards.data ?? []}
          onRegistered={cards.reload}
        />
      </div>
      <div hidden={mode !== "single"}>
        <CardForm
          terms={theme.quiz.terms}
          draft={draft}
          subjects={subjects}
          isSaving={isSaving}
          error={error}
          notice={notice}
          onChange={handleChange}
          onSubmit={() => void handleSubmit()}
        />
      </div>
      <CardList terms={theme.quiz.terms} cards={cards} />
    </main>
  );
}
