import { parseSettingsInput } from "@/domain/settings-input";
import {
  badRequest,
  created,
  readJson,
  serverError,
  success,
} from "@/lib/api-response";
import { resolveOwner } from "@/lib/owner";
import { isWorldId } from "@/themes/types";

/** 選んだ世界線を保存する。 */
export async function POST(request: Request): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;

  const input = parseSettingsInput(await readJson(request));
  if (!input.ok) return badRequest(input.error);

  const action = "設定の保存";
  try {
    const { error } = await owner.value.db
      .from("user_settings")
      .upsert(
        {
          ...owner.value.columns,
          world_id: input.value.worldId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: owner.value.column },
      );
    return error ? serverError(action, error) : created();
  } catch (error) {
    return serverError(action, error);
  }
}

/** 選んでいる世界線を返す。まだ選んでいなければ null。 */
export async function GET(request: Request): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;

  const action = "設定の取得";
  try {
    const { data, error } = await owner.value.db
      .from("user_settings")
      .select("world_id")
      .eq(owner.value.column, owner.value.id)
      .limit(1);
    if (error) return serverError(action, error);

    const worldId = data[0]?.world_id;
    return success({ worldId: isWorldId(worldId) ? worldId : null });
  } catch (error) {
    return serverError(action, error);
  }
}
