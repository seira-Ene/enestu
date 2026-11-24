import { isWorldId, type WorldId } from "@/themes/types";
import { getField, postJson, type ApiResult } from "./api-client";

const ENDPOINT = "/api/settings";

/** まだ選んでいなければ null。 */
export function fetchWorld(): Promise<ApiResult<WorldId | null>> {
  return getField(ENDPOINT, "worldId", isWorldIdOrNull);
}

export function saveWorld(worldId: WorldId): Promise<ApiResult<null>> {
  return postJson(ENDPOINT, { worldId });
}

function isWorldIdOrNull(value: unknown): value is WorldId | null {
  return value === null || isWorldId(value);
}
