import type { StudyLogInput } from "@/domain/study-log-input";
import type { StudyLog } from "@/domain/study-time";
import { getDeviceId } from "./device-id";

const ENDPOINT = "/api/study-logs";
const TIMEOUT_MS = 15_000;

export type ApiResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };

export async function fetchTodayLogs(): Promise<ApiResult<StudyLog[]>> {
  const result = await request({ method: "GET" });
  if (!result.ok) return result;
  const logs = readField(result.value, "logs");
  if (!Array.isArray(logs) || !logs.every(isStudyLog)) {
    return { ok: false, error: "記録を読み取れませんでした。" };
  }
  return { ok: true, value: logs };
}

export async function saveStudyLog(
  input: StudyLogInput,
): Promise<ApiResult<null>> {
  const result = await request({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return result.ok ? { ok: true, value: null } : result;
}

async function request(init: {
  method: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
}): Promise<ApiResult<unknown>> {
  try {
    const response = await fetch(ENDPOINT, {
      ...init,
      headers: { ...init.headers, "x-device-id": getDeviceId() },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body: unknown = await response.json();
    if (response.ok) return { ok: true, value: body };
    const message = readField(body, "error");
    return {
      ok: false,
      error:
        typeof message === "string" ? message : "サーバーで問題が起きました。",
    };
  } catch {
    return {
      ok: false,
      error: "通信できませんでした。接続を確認してください。",
    };
  }
}

function readField(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null) return undefined;
  return new Map<string, unknown>(Object.entries(value)).get(key);
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
