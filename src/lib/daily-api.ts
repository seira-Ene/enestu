import {
  isDailyKind,
  type DailyClaim,
  type DailyKind,
  type DailyStatus,
} from "@/domain/daily";
import type { WorldId } from "@/themes/types";
import { getField, postForField, type ApiResult } from "./api-client";

export function fetchDailyStatus(): Promise<ApiResult<DailyStatus>> {
  return getField("/api/daily", "daily", isDailyStatus);
}

export function claimDaily(
  kind: DailyKind,
  world: WorldId,
): Promise<ApiResult<DailyClaim>> {
  return postForField("/api/daily", { kind, world }, "claim", isDailyClaim);
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function isDailyStatus(value: unknown): value is DailyStatus {
  if (typeof value !== "object" || value === null) return false;
  const fields: Partial<Record<keyof DailyStatus, unknown>> = value;
  return (
    typeof fields.day === "string" &&
    DAY.test(fields.day) &&
    Array.isArray(fields.claimed) &&
    fields.claimed.every(isDailyKind) &&
    isCount(fields.studySeconds) &&
    isCount(fields.answers) &&
    isCount(fields.explanations) &&
    isCount(fields.streak) &&
    (fields.lastVisit === null ||
      (typeof fields.lastVisit === "string" && DAY.test(fields.lastVisit)))
  );
}

function isDailyClaim(value: unknown): value is DailyClaim {
  if (typeof value !== "object" || value === null) return false;
  const fields: Partial<Record<keyof DailyClaim, unknown>> = value;
  return (
    isDailyKind(fields.kind) &&
    isCount(fields.tickets) &&
    (fields.itemId === null || typeof fields.itemId === "string") &&
    isCount(fields.streak)
  );
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
