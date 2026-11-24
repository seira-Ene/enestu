"use client";

import { useRef, useState } from "react";
import { listSubjects } from "@/domain/quiz";
import { parseCardDraft } from "@/domain/quiz-input";
import { fetchCards, saveCard } from "@/lib/quiz-api";
import { fetchTodayLogs } from "@/lib/study-log-api";
import { useRemote } from "@/lib/use-remote";
import type { WorldTheme } from "@/themes/types";
import { CardForm, type CardDraft } from "./CardForm";
import { CardList } from "./CardList";

const EMPTY_DRAFT: CardDraft = { subject: "", question: "", answer: "" };

export function CardsScreen({ theme }: { theme: WorldTheme }) {
  const cards = useRemote(fetchCards);
  const todayLogs = useRemote(fetchTodayLogs);
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
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-primary">
          {theme.quiz.terms.card}
        </h1>
        <p className="text-sm text-accent">カードの登録</p>
      </header>
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
      <CardList
        terms={theme.quiz.terms}
        cards={cards.data}
        error={cards.error}
        onReload={() => void cards.reload()}
      />
    </main>
  );
}
