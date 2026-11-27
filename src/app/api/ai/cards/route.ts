import { parseAiCardRequest, parseAiCards } from "@/domain/ai-cards";
import { aiProblem, badRequest, loginRequired, readJson, serverError, success } from "@/lib/api-response";
import { prepareAiCall } from "@/lib/ai-access";
import { geminiFailureResponse } from "@/lib/ai-failure";
import { generateGeminiCards } from "@/lib/gemini";
import { resolveOwner } from "@/lib/owner";

/** Gemini の返事を待つため、関数の待ち時間を延ばす。 */
export const maxDuration = 60;

/**
 * 資料（文章と写真）から、AIで問題の候補を作る。保存はしない。
 * 候補は本人が確認画面で確かめてから、今ある登録の仕組みで保存する。
 */
export async function POST(request: Request): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;
  if (owner.value.kind !== "user") return loginRequired();

  const input = parseAiCardRequest(await readJson(request));
  if (!input.ok) return badRequest(input.error);

  const action = "AIでの問題作り";
  try {
    const prepared = await prepareAiCall(owner.value, "cards");
    if (!prepared.ok) return prepared.response;

    const generated = await generateGeminiCards(prepared.key, input.value);
    if (!generated.ok) return geminiFailureResponse(generated.failure);

    const existing = await owner.value.db
      .from("quiz_cards")
      .select("question, answer")
      .eq("user_id", owner.value.id)
      .is("archived_at", null);
    if (existing.error) throw new Error("登録済みのカードを読めない");

    const candidates = parseAiCards(generated.value, existing.data);
    if (!candidates.ok) return aiProblem(502, "ai_output", candidates.error);
    return success({ candidates: candidates.value });
  } catch (error) {
    // キーや資料を含まないよう、エラーの種類だけを残す。
    return serverError(action, error instanceof Error ? error.message : "不明");
  }
}
