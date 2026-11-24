import type { ProgressTotals } from "@/domain/progress";
import { getField, type ApiResult } from "./api-client";

export function fetchProgress(): Promise<ApiResult<ProgressTotals>> {
  return getField("/api/progress", "totals", isProgressTotals);
}

function isProgressTotals(value: unknown): value is ProgressTotals {
  if (typeof value !== "object" || value === null) return false;
  const fields: Partial<Record<keyof ProgressTotals, unknown>> = value;
  return isCount(fields.studySeconds) && isCount(fields.correctCount);
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
