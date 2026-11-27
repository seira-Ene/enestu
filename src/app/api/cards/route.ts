import { limitMessage } from "@/domain/limits";
import type { QuizCard } from "@/domain/quiz";
import { parseQuizCardInput } from "@/domain/quiz-input";
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

/** 一問一答カードを1枚登録する。 */
export async function POST(request: Request): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;

  const input = parseQuizCardInput(await readJson(request));
  if (!input.ok) return badRequest(input.error);

  const action = "カードの登録";
  try {
    // 同じidの再送は無視し、二重登録を防ぐ。
    const { error } = await owner.value.db
      .from("quiz_cards")
      .upsert(
        {
          id: input.value.id,
          ...owner.value.columns,
          subject: input.value.subject,
          question: input.value.question,
          answer: input.value.answer,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
    if (isRowLimit(error)) return limitReached(limitMessage("quiz_cards"));
    return error ? serverError(action, error) : created();
  } catch (error) {
    return serverError(action, error);
  }
}

/** 自分のカードを新しい順に返す。隠したカードは含まない。 */
export async function GET(request: Request): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;

  const action = "カードの取得";
  try {
    const { data, error } = await owner.value.db
      .from("quiz_cards")
      .select("id, subject, question, answer")
      .eq(owner.value.column, owner.value.id)
      .is("archived_at", null)
      .order("created_at", { ascending: false });
    if (error) return serverError(action, error);

    const cards: QuizCard[] = data.map((row) => ({
      id: row.id,
      subject: row.subject,
      question: row.question,
      answer: row.answer,
    }));
    return success({ cards });
  } catch (error) {
    return serverError(action, error);
  }
}
