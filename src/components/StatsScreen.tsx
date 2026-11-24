"use client";

import { fetchStats } from "@/lib/stats-api";
import { useRemote } from "@/lib/use-remote";
import { DailyQuest } from "./DailyQuest";
import { ScreenHeader } from "./ScreenHeader";
import { SubjectStatsList } from "./SubjectStatsList";
import { useWorld } from "./WorldProvider";

export function StatsScreen() {
  const { theme } = useWorld();
  const remote = useRemote(fetchStats);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-6">
      <ScreenHeader title={theme.terms.navStats} subtitle="苦手の集計" />
      <DailyQuest theme={theme.quest} remote={remote} />
      {remote.data !== null && <SubjectStatsList stats={remote.data.stats} />}
    </main>
  );
}
