import {
  parseAiQuest,
  QUEST_INSTRUCTION,
  QUEST_RESPONSE_SCHEMA,
  questDigest,
  wrapDigest,
} from "@/domain/ai-quest";
import { aiProblem, loginRequired, serverError, success } from "@/lib/api-response";
import { prepareAiCall } from "@/lib/ai-access";
import { geminiFailureResponse } from "@/lib/ai-failure";
import { generateGeminiJson } from "@/lib/gemini";
import { resolveOwner } from "@/lib/owner";
import { readSubjectStats } from "@/lib/subject-stats-server";

/** Gemini の返事を待つため、関数の待ち時間を延ばす。 */
export const maxDuration = 60;

/**
 * 科目ごとの集計（数字だけ）をAIに見せて、今日のクエストを相談する。保存はしない。
 * 採用するかは本人が決め、目標の量と達成の判定は今の決まりのまま。
 */
export async function POST(request: Request): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;
  if (owner.value.kind !== "user") return loginRequired();

  const action = "AIへのクエストの相談";
  try {
    // 集計がなければ、回数を使わずに断る。
    const stats = await readSubjectStats(owner.value, new Date());
    if (stats.length === 0) {
      return aiProblem(
        409,
        "ai_quest_empty",
        "まだ集計がありません。学習や問題を記録してから相談してください。",
      );
    }

    const prepared = await prepareAiCall(owner.value, "quest");
    if (!prepared.ok) return prepared.response;

    const generated = await generateGeminiJson(prepared.key, {
      instruction: QUEST_INSTRUCTION,
      material: wrapDigest(questDigest(stats)),
      schema: QUEST_RESPONSE_SCHEMA,
    });
    if (!generated.ok) return geminiFailureResponse(generated.failure);

    const quest = parseAiQuest(generated.value, stats);
    if (!quest.ok) return aiProblem(502, "ai_output", quest.error);
    return success({ quest: quest.value });
  } catch (error) {
    // 集計や返事を含まないよう、エラーの種類だけを残す。
    return serverError(action, error instanceof Error ? error.message : "不明");
  }
}
