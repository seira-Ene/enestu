import { limitMessage } from "@/domain/limits";
import { isMistakeReason, type AnswerLog } from "@/domain/quiz";
import { parseAnswerLogInput } from "@/domain/quiz-input";
import {
  badRequest,
  created,
  isRowLimit,
  limitReached,
  readJson,
  serverError,
  success,
} from "@/lib/api-response";
import { resolveOwner } from "@/lib/owner";

const HISTORY_LIMIT = 20;
/** PostgreSQLの外部キー違反。カードがないか、他の人のカード。 */
const FOREIGN_KEY_VIOLATION = "23503";

/** 解答を1件記録する。 */
export async function POST(request: Request): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;

  const body = await readJson(request);
  const input = parseAnswerLogInput(body, new Date());
  if (!input.ok) return badRequest(input.error);

  const action = "解答の保存";
  try {
    // 同じidの再送は無視し、二重登録を防ぐ。
    const { error } = await owner.value.db
      .from("answer_logs")
      .upsert(
        {
          id: input.value.id,
          ...owner.value.columns,
          card_id: input.value.cardId,
          user_answer: input.value.userAnswer,
          is_correct: input.value.isCorrect,
          mistake_reason: input.value.mistakeReason,
          answered_at: input.value.answeredAt,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
    if (isRowLimit(error)) return limitReached(limitMessage("answer_logs"));
    if (error?.code === FOREIGN_KEY_VIOLATION) {
      return badRequest("カードが見つかりません。");
    }
    return error ? serverError(action, error) : created();
  } catch (error) {
    return serverError(action, error);
  }
}

/** 自分の直近の解答を新しい順に返す。 */
export async function GET(request: Request): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;

  const action = "解答履歴の取得";
  try {
    const { data, error } = await owner.value.db
      .from("answer_logs")
      .select("id, card_id, user_answer, is_correct, mistake_reason, answered_at")
      .eq(owner.value.column, owner.value.id)
      .order("answered_at", { ascending: false })
      .limit(HISTORY_LIMIT);
    if (error) return serverError(action, error);

    const logs: AnswerLog[] = data.map((row) => ({
      id: row.id,
      cardId: row.card_id,
      userAnswer: row.user_answer,
      isCorrect: row.is_correct,
      mistakeReason: isMistakeReason(row.mistake_reason)
        ? row.mistake_reason
        : null,
      answeredAt: row.answered_at,
    }));
    return success({ logs });
  } catch (error) {
    return serverError(action, error);
  }
}
