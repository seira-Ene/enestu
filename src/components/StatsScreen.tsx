"use client";

import { fetchStats } from "@/lib/stats-api";
import { useRemote } from "@/lib/use-remote";
import { DailyQuest } from "./DailyQuest";
import { ScreenHeader } from "./ScreenHeader";
import { ScreenLayout } from "./ScreenLayout";
import { SubjectStatsList } from "./SubjectStatsList";
import { useWorld } from "./WorldProvider";

export function StatsScreen() {
  const { theme } = useWorld();
  const remote = useRemote(fetchStats);

  return (
    <ScreenLayout>
      <ScreenHeader title={theme.terms.navStats} subtitle="苦手の集計" />
      {/* PC版では、左にクエスト、右に科目別の集計を並べる。 */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(18rem,1fr)_minmax(0,2.2fr)] lg:items-start">
        <DailyQuest theme={theme.quest} remote={remote} />
        {remote.data !== null && (
          <SubjectStatsList stats={remote.data.stats} />
        )}
      </div>
    </ScreenLayout>
  );
}
