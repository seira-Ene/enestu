import { parseSettingsInput } from "@/domain/settings-input";
import {
  badRequest,
  created,
  readDeviceId,
  readJson,
  serverError,
  success,
} from "@/lib/api-response";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { isWorldId } from "@/themes/types";

/** 選んだ世界線を保存する。 */
export async function POST(request: Request): Promise<Response> {
  const deviceId = readDeviceId(request);
  if (!deviceId.ok) return badRequest(deviceId.error);

  const input = parseSettingsInput(await readJson(request));
  if (!input.ok) return badRequest(input.error);

  const action = "設定の保存";
  try {
    const { error } = await createSupabaseAdminClient()
      .from("user_settings")
      .upsert(
        {
          device_id: deviceId.value,
          world_id: input.value.worldId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "device_id" },
      );
    return error ? serverError(action, error) : created();
  } catch (error) {
    return serverError(action, error);
  }
}

/** 選んでいる世界線を返す。まだ選んでいなければ null。 */
export async function GET(request: Request): Promise<Response> {
  const deviceId = readDeviceId(request);
  if (!deviceId.ok) return badRequest(deviceId.error);

  const action = "設定の取得";
  try {
    const { data, error } = await createSupabaseAdminClient()
      .from("user_settings")
      .select("world_id")
      .eq("device_id", deviceId.value)
      .limit(1);
    if (error) return serverError(action, error);

    const worldId = data[0]?.world_id;
    return success({ worldId: isWorldId(worldId) ? worldId : null });
  } catch (error) {
    return serverError(action, error);
  }
}
