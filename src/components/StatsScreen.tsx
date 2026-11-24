"use client";

import { fetchStats } from "@/lib/stats-api";
import { useRemote } from "@/lib/use-remote";
import type { WorldTheme } from "@/themes/types";
import { DailyQuest } from "./DailyQuest";
import { SubjectStatsList } from "./SubjectStatsList";

export function StatsScreen({ theme }: { theme: WorldTheme }) {
  const remote = useRemote(fetchStats);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-primary">
          {theme.terms.navStats}
        </h1>
        <p className="text-sm text-accent">苦手の集計</p>
      </header>
      <DailyQuest theme={theme.quest} remote={remote} />
      {remote.data !== null && <SubjectStatsList stats={remote.data.stats} />}
    </main>
  );
}
