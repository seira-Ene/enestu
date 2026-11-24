import { jstDayRange } from "@/domain/study-time";
import {
  attachToday,
  statsSince,
  type SubjectCounts,
} from "@/domain/subject-stats";
import {
  badRequest,
  readDeviceId,
  serverError,
  success,
} from "@/lib/api-response";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type StatsRow =
  Database["public"]["Functions"]["subject_stats"]["Returns"][number];

/** この端末の、科目別の集計（直近30日と今日）を返す。 */
export async function GET(request: Request): Promise<Response> {
  const deviceId = readDeviceId(request);
  if (!deviceId.ok) return badRequest(deviceId.error);

  const action = "集計の取得";
  const now = new Date();
  try {
    const supabase = createSupabaseAdminClient();
    const countSince = (since: Date) =>
      supabase.rpc("subject_stats", {
        p_device_id: deviceId.value,
        p_since: since.toISOString(),
      });
    const [recent, today] = await Promise.all([
      countSince(statsSince(now)),
      countSince(jstDayRange(now).start),
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
