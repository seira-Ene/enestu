import {
  isRarityId,
  type GachaStatus,
  type OwnedPrize,
  type Pull,
  type PullCount,
} from "@/domain/gacha";
import type { WorldId } from "@/themes/types";
import { getField, postForField, type ApiResult } from "./api-client";

export type GachaState = {
  readonly status: GachaStatus;
  readonly collection: readonly OwnedPrize[];
};

export function fetchGacha(): Promise<ApiResult<GachaState>> {
  return getField("/api/gacha", "gacha", isGachaState);
}

export function pullGacha(
  world: WorldId,
  count: PullCount,
): Promise<ApiResult<Pull[]>> {
  return postForField(
    "/api/gacha",
    { world, count },
    "pulls",
    (value): value is Pull[] => Array.isArray(value) && value.every(isPull),
  );
}

function isGachaState(value: unknown): value is GachaState {
  if (typeof value !== "object" || value === null) return false;
  const { status, collection }: Partial<Record<keyof GachaState, unknown>> =
    value;
  return (
    isStatus(status) && Array.isArray(collection) && collection.every(isOwned)
  );
}

function isStatus(value: unknown): value is GachaStatus {
  if (typeof value !== "object" || value === null) return false;
  const fields: Partial<Record<keyof GachaStatus, unknown>> = value;
  return (
    isCount(fields.earned) && isCount(fields.spent) && isCount(fields.sinceTop)
  );
}

function isOwned(value: unknown): value is OwnedPrize {
  if (typeof value !== "object" || value === null) return false;
  const { itemId, copies }: Partial<Record<keyof OwnedPrize, unknown>> = value;
  return typeof itemId === "string" && isCount(copies) && copies > 0;
}

function isPull(value: unknown): value is Pull {
  if (typeof value !== "object" || value === null) return false;
  const { seq, itemId, rarity }: Partial<Record<keyof Pull, unknown>> = value;
  return isCount(seq) && typeof itemId === "string" && isRarityId(rarity);
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
