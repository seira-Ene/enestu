import type { ProgressTotals } from "@/domain/progress";
import { serverError, success } from "@/lib/api-response";
import { resolveOwner, type Owner } from "@/lib/owner";

/** 自分の、これまでの合計（学習時間と正解数）を返す。 */
export async function GET(request: Request): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;

  const action = "レベルの取得";
  try {
    const { data, error } = await countTotals(owner.value);
    if (error) return serverError(action, error);

    const row = data[0];
    const totals: ProgressTotals = {
      studySeconds: row?.study_seconds ?? 0,
      correctCount: row?.correct_count ?? 0,
    };
    return success({ totals });
  } catch (error) {
    return serverError(action, error);
  }
}

function countTotals(owner: Owner) {
  return owner.kind === "user"
    ? owner.db.rpc("my_progress_totals")
    : owner.db.rpc("progress_totals", { p_device_id: owner.id });
}
