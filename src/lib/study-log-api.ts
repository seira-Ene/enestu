import type { StudyLogInput } from "@/domain/study-log-input";
import type { StudyLog } from "@/domain/study-time";
import { getList, postJson, type ApiResult } from "./api-client";

const ENDPOINT = "/api/study-logs";

export function fetchTodayLogs(): Promise<ApiResult<StudyLog[]>> {
  return getList(ENDPOINT, "logs", isStudyLog);
}

export function saveStudyLog(input: StudyLogInput): Promise<ApiResult<null>> {
  return postJson(ENDPOINT, input);
}

function isStudyLog(value: unknown): value is StudyLog {
  if (typeof value !== "object" || value === null) return false;
  const fields: Partial<Record<keyof StudyLog, unknown>> = value;
  return (
    typeof fields.id === "string" &&
    typeof fields.subject === "string" &&
    typeof fields.startedAt === "string" &&
    typeof fields.endedAt === "string" &&
    typeof fields.durationSeconds === "number"
  );
}
