import type { AiKeySummary } from "@/domain/ai-key";
import {
  deleteResource,
  getField,
  postForField,
  type ApiResult,
} from "./api-client";

/** 読み込み中と区別できるよう、保存してあるキーを saved に包んで返す。 */
export async function fetchAiKey(): Promise<
  ApiResult<{ readonly saved: AiKeySummary | null }>
> {
  const result = await getField("/api/ai-key", "aiKey", isSummaryOrNull);
  return result.ok ? { ok: true, value: { saved: result.value } } : result;
}

/** キーは保存のときにだけ送る。応答には末尾4文字しか入らない。 */
export function saveAiKey(key: string): Promise<ApiResult<AiKeySummary | null>> {
  return postForField(
    "/api/ai-key",
    { provider: "gemini", key },
    "aiKey",
    isSummaryOrNull,
  );
}

export function deleteAiKey(): Promise<ApiResult<null>> {
  return deleteResource("/api/ai-key");
}

function isSummaryOrNull(value: unknown): value is AiKeySummary | null {
  if (value === null) return true;
  if (typeof value !== "object") return false;
  const { provider, last4, updatedAt }: Partial<Record<keyof AiKeySummary, unknown>> =
    value;
  return (
    provider === "gemini" &&
    typeof last4 === "string" &&
    last4.length === 4 &&
    typeof updatedAt === "string"
  );
}
