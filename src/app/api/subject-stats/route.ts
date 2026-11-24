import { jstDayRange } from "@/domain/study-time";
import {
  attachToday,
  statsSince,
  type SubjectCounts,
} from "@/domain/subject-stats";
import { serverError, success } from "@/lib/api-response";
import { resolveOwner, type Owner } from "@/lib/owner";
import type { Database } from "@/lib/supabase/database.types";

type StatsRow =
  Database["public"]["Functions"]["subject_stats"]["Returns"][number];

/** 自分の、科目別の集計（直近30日と今日）を返す。 */
export async function GET(request: Request): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;

  const action = "集計の取得";
  const now = new Date();
  try {
    const [recent, today] = await Promise.all([
      countSince(owner.value, statsSince(now)),
      countSince(owner.value, jstDayRange(now).start),
    ]);
    if (recent.error) return serverError(action, recent.error);
    if (today.error) return serverError(action, today.error);

    const stats = attachToday(
      recent.data.map(toCounts),
      today.data.map(toCounts),
    );
    return success({ stats });
  } catch (error) {
    return serverError(action, error);
  }
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
