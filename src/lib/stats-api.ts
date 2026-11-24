import { MISTAKE_REASONS } from "@/domain/quiz";
import { jstDateKey } from "@/domain/study-time";
import type { SubjectStats } from "@/domain/subject-stats";
import { resolveQuest, type Quest } from "@/domain/weakness";
import { getList, type ApiResult } from "./api-client";
import { loadSavedQuest, saveQuest } from "./daily-quest";

export type StatsWithQuest = {
  readonly stats: readonly SubjectStats[];
  readonly quest: Quest;
};

/** 科目別の集計を取得し、今日のクエストを決める。 */
export async function fetchStats(): Promise<ApiResult<StatsWithQuest>> {
  const result = await getList("/api/subject-stats", "stats", isSubjectStats);
  if (!result.ok) return result;
  const stats = result.value;
  const today = jstDateKey(new Date());
  const quest = resolveQuest(loadSavedQuest(), today, stats);
  if (quest.kind === "weak" || quest.kind === "neglected") {
    saveQuest({ date: today, kind: quest.kind, subject: quest.subject });
  }
  return { ok: true, value: { stats, quest } };
}

function isSubjectStats(value: unknown): value is SubjectStats {
  if (typeof value !== "object" || value === null) return false;
  const fields: Partial<Record<keyof SubjectStats, unknown>> = value;
  const { reasons } = fields;
  if (typeof reasons !== "object" || reasons === null) return false;
  const counts = new Map<string, unknown>(Object.entries(reasons));
  return (
    typeof fields.subject === "string" &&
    isCount(fields.studySeconds) &&
    isCount(fields.answerCount) &&
    isCount(fields.correctCount) &&
    isCount(fields.todayStudySeconds) &&
    isCount(fields.todayAnswerCount) &&
    MISTAKE_REASONS.every((reason) => isCount(counts.get(reason)))
  );
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
