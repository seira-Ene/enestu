import { serverError, success } from "@/lib/api-response";
import { resolveOwner } from "@/lib/owner";
import { readSubjectStats } from "@/lib/subject-stats-server";

/** 自分の、科目別の集計（直近30日と今日）を返す。 */
export async function GET(request: Request): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;

  try {
    return success({ stats: await readSubjectStats(owner.value, new Date()) });
  } catch (error) {
    return serverError("集計の取得", error);
  }
}
