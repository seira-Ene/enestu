import "server-only";
import { jstDayRange } from "@/domain/study-time";
import {
  attachToday,
  statsSince,
  type SubjectCounts,
  type SubjectStats,
} from "@/domain/subject-stats";
import type { Owner } from "./owner";
import type { Database } from "./supabase/database.types";

type StatsRow =
  Database["public"]["Functions"]["subject_stats"]["Returns"][number];

/** 持ち主の、科目別の集計（直近30日と今日）。読めなければ例外。 */
export async function readSubjectStats(
  owner: Owner,
  now: Date,
): Promise<SubjectStats[]> {
  const [recent, today] = await Promise.all([
    countSince(owner, statsSince(now)),
    countSince(owner, jstDayRange(now).start),
  ]);
  if (recent.error) throw recent.error;
  if (today.error) throw today.error;
  return attachToday(recent.data.map(toCounts), today.data.map(toCounts));
}

function countSince(owner: Owner, since: Date) {
  const p_since = since.toISOString();
  return owner.kind === "user"
    ? owner.db.rpc("my_subject_stats", { p_since })
    : owner.db.rpc("subject_stats", { p_device_id: owner.id, p_since });
}

function toCounts(row: StatsRow): SubjectCounts {
  return {
    subject: row.subject,
    studySeconds: row.study_seconds,
    answerCount: row.answer_count,
    correctCount: row.correct_count,
    reasons: {
      knowledge: row.knowledge_count,
      understanding: row.understanding_count,
      careless: row.careless_count,
    },
  };
}
