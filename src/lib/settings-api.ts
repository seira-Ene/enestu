import type { Settings } from "@/domain/settings-input";
import { isWorldId, type WorldId } from "@/themes/types";
import { getField, postJson, type ApiResult } from "./api-client";

const ENDPOINT = "/api/settings";

export function fetchSettings(): Promise<ApiResult<Settings>> {
  return getField(ENDPOINT, "settings", isSettings);
}

export function saveWorld(worldId: WorldId): Promise<ApiResult<null>> {
  return postJson(ENDPOINT, { worldId });
}

/** 空なら、名前を消す。 */
export function saveHeroName(heroName: string): Promise<ApiResult<null>> {
  return postJson(ENDPOINT, { heroName });
}

function isSettings(value: unknown): value is Settings {
  if (typeof value !== "object" || value === null) return false;
  const { worldId, heroName }: Partial<Record<keyof Settings, unknown>> = value;
  return (
    (worldId === null || isWorldId(worldId)) &&
    (heroName === null || typeof heroName === "string")
  );
}
