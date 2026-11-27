import { averageBySubject } from "@/domain/explanation";
import { statsSince } from "@/domain/subject-stats";
import { serverError, success } from "@/lib/api-response";
import { resolveOwner } from "@/lib/owner";

/** 集計する記録の上限。新しい方から数える。 */
const LOG_LIMIT = 500;

/** 直近30日の、科目ごとの理解度の平均を返す。 */
export async function GET(request: Request): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;
  const { db, column, id } = owner.value;

  const action = "理解度の集計";
  try {
    const [logs, terms] = await Promise.all([
      db
        .from("explanation_logs")
        .select("term_id, total_count, missing")
        .eq(column, id)
        .gte("explained_at", statsSince(new Date()).toISOString())
        .order("explained_at", { ascending: false })
        .limit(LOG_LIMIT),
      db
        .from("explain_terms")
        .select("id, subject")
        .eq(column, id)
        .is("archived_at", null),
    ]);
    if (logs.error) return serverError(action, logs.error);
    if (terms.error) return serverError(action, terms.error);

    const averages = averageBySubject(
      logs.data.map((row) => ({
        termId: row.term_id,
        totalCount: row.total_count,
        missing: row.missing,
      })),
      terms.data,
    );
    return success({ averages });
  } catch (error) {
    return serverError(action, error);
  }
}
