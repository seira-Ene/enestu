import type { AiImage } from "@/domain/ai-cards";
import type { GeneratedCandidate } from "@/domain/card-generator";
import { postForField, type ApiResult } from "./api-client";

/** Gemini の返事を待つ時間。サーバーの待ち時間（60秒）より少し長くする。 */
const AI_TIMEOUT_MS = 65_000;

export function checkAi(): Promise<ApiResult<{ readonly model: string }>> {
  return postForField(
    "/api/ai/check",
    {},
    "check",
    (value): value is { model: string } =>
      typeof value === "object" &&
      value !== null &&
      "model" in value &&
      typeof value.model === "string",
  );
}

export function generateAiCards(
  text: string,
  images: readonly AiImage[],
): Promise<ApiResult<GeneratedCandidate[]>> {
  return postForField(
    "/api/ai/cards",
    { text, images },
    "candidates",
    (value): value is GeneratedCandidate[] =>
      Array.isArray(value) && value.every(isCandidate),
    AI_TIMEOUT_MS,
  );
}

function isCandidate(value: unknown): value is GeneratedCandidate {
  if (typeof value !== "object" || value === null) return false;
  const { question, answer, source, rule }: Partial<
    Record<keyof GeneratedCandidate, unknown>
  > = value;
  return (
    typeof question === "string" &&
    typeof answer === "string" &&
    typeof source === "string" &&
    rule === "ai"
  );
}
