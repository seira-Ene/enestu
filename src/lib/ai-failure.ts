import { aiProblem } from "./api-response";
import type { GeminiFailure } from "./gemini";

/** Gemini を使えなかった理由を、利用者に伝える応答にする。 */
export function geminiFailureResponse(failure: GeminiFailure): Response {
  switch (failure) {
    case "invalid_key":
      return aiProblem(
        409,
        "ai_key_invalid",
        "Gemini がキーを受け付けませんでした。キーが正しいか、アカウントの画面で確かめてください。",
      );
    case "quota":
      return aiProblem(
        429,
        "ai_quota",
        "Gemini の利用上限に達しました。時間をおいて試すか、AIなしで作ってください。",
      );
    case "blocked":
      return aiProblem(
        422,
        "ai_blocked",
        "Gemini が、この資料からは作れないと答えました。資料を変えるか、AIなしで作ってください。",
      );
    case "bad_output":
      return aiProblem(
        502,
        "ai_output",
        "AIの返事を読み取れませんでした。もう一度試すか、AIなしで作ってください。",
      );
    case "unavailable":
    case "timeout":
      return aiProblem(
        503,
        "ai_unavailable",
        "Gemini につながりませんでした。時間をおいて試すか、AIなしで作ってください。",
      );
  }
}
