import {
  badRequest,
  readDeviceId,
  serverError,
  signedOut,
  success,
} from "@/lib/api-response";
import { resolveOwner } from "@/lib/owner";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * この端末の記録を、ログイン中の利用者へ移す。元には戻せない。
 * 全部移るか、1件も移らないかのどちらかになる。
 */
export async function POST(request: Request): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;
  if (owner.value.kind !== "user") return signedOut();
  const deviceId = readDeviceId(request);
  if (!deviceId.ok) return badRequest(deviceId.error);

  const action = "記録の引き継ぎ";
  try {
    const { data, error } = await createSupabaseAdminClient().rpc(
      "claim_device_records",
      { p_device_id: deviceId.value, p_user_id: owner.value.id },
    );
    if (error) return serverError(action, error);

    const row = data[0];
    return success({
      moved: {
        studyLogs: row?.study_logs ?? 0,
        cards: row?.cards ?? 0,
        answers: row?.answers ?? 0,
      },
    });
  } catch (error) {
    return serverError(action, error);
  }
}
