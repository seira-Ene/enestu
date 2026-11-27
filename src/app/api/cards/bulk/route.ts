import { limitMessage } from "@/domain/limits";
import { parseBulkCards } from "@/domain/quiz-input";
import {
  badRequest,
  created,
  isRowLimit,
  limitReached,
  readJson,
  serverError,
} from "@/lib/api-response";
import { resolveOwner } from "@/lib/owner";

/** カードをまとめて登録する。1枚でも正しくなければ、どれも登録しない。 */
export async function POST(request: Request): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;

  const input = parseBulkCards(await readJson(request));
  if (!input.ok) return badRequest(input.error);

  const action = "カードの登録";
  try {
    // 同じidの再送は無視し、二重登録を防ぐ。
    const { error } = await owner.value.db
      .from("quiz_cards")
      .upsert(
        input.value.map((card) => ({
          id: card.id,
          ...owner.value.columns,
          subject: card.subject,
          question: card.question,
          answer: card.answer,
        })),
        { onConflict: "id", ignoreDuplicates: true },
      );
    if (isRowLimit(error)) return limitReached(limitMessage("quiz_cards"));
    return error ? serverError(action, error) : created();
  } catch (error) {
    return serverError(action, error);
  }
}
