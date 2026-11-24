import type { ProgressTotals } from "@/domain/progress";
import {
  badRequest,
  readDeviceId,
  serverError,
  success,
} from "@/lib/api-response";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/** この端末の、これまでの合計（学習時間と正解数）を返す。 */
export async function GET(request: Request): Promise<Response> {
  const deviceId = readDeviceId(request);
  if (!deviceId.ok) return badRequest(deviceId.error);

  const action = "レベルの取得";
  try {
    const { data, error } = await createSupabaseAdminClient().rpc(
      "progress_totals",
      { p_device_id: deviceId.value },
    );
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
