import { loginRequired, serverError, success } from "@/lib/api-response";
import { prepareAiCall } from "@/lib/ai-access";
import { geminiFailureResponse } from "@/lib/ai-failure";
import { checkGeminiKey } from "@/lib/gemini";
import { resolveOwner } from "@/lib/owner";

/** 保存したキーで、Gemini につながるか確かめる（問題は作らない）。 */
export async function POST(request: Request): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;
  if (owner.value.kind !== "user") return loginRequired();

  const action = "AIの接続の確認";
  try {
    const prepared = await prepareAiCall(owner.value, "check");
    if (!prepared.ok) return prepared.response;
    const result = await checkGeminiKey(prepared.key);
    return result.ok
      ? success({ check: { model: result.value.model } })
      : geminiFailureResponse(result.failure);
  } catch (error) {
    // キーや資料を含まないよう、エラーの種類だけを残す。
    return serverError(action, error instanceof Error ? error.message : "不明");
  }
}
