import { parseSettingsInput, type Settings } from "@/domain/settings-input";
import {
  badRequest,
  created,
  readJson,
  serverError,
  success,
} from "@/lib/api-response";
import { resolveOwner } from "@/lib/owner";
import { isWorldId } from "@/themes/types";

/** 世界線か主人公の名前を保存する。送られた項目だけを変える。 */
export async function POST(request: Request): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;

  const input = parseSettingsInput(await readJson(request));
  if (!input.ok) return badRequest(input.error);
  const { worldId, heroName } = input.value;

  const action = "設定の保存";
  try {
    const { error } = await owner.value.db.from("user_settings").upsert(
      {
        ...owner.value.columns,
        ...(worldId !== undefined && { world_id: worldId }),
        ...(heroName !== undefined && { hero_name: heroName }),
        updated_at: new Date().toISOString(),
      },
      { onConflict: owner.value.column },
    );
    return error ? serverError(action, error) : created();
  } catch (error) {
    return serverError(action, error);
  }
}

/** 選んでいる世界線と、主人公の名前を返す。まだなければ null。 */
export async function GET(request: Request): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;

  const action = "設定の取得";
  try {
    const { data, error } = await owner.value.db
      .from("user_settings")
      .select("world_id, hero_name")
      .eq(owner.value.column, owner.value.id)
      .limit(1);
    if (error) return serverError(action, error);

    const row = data[0];
    const worldId = row?.world_id;
    const settings: Settings = {
      worldId: isWorldId(worldId) ? worldId : null,
      heroName: row?.hero_name ?? null,
    };
    return success({ settings });
  } catch (error) {
    return serverError(action, error);
  }
}
