import { parseBulkCards } from "@/domain/quiz-input";
import {
  badRequest,
  created,
  readDeviceId,
  readJson,
  serverError,
} from "@/lib/api-response";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/** カードをまとめて登録する。1枚でも正しくなければ、どれも登録しない。 */
export async function POST(request: Request): Promise<Response> {
  const deviceId = readDeviceId(request);
  if (!deviceId.ok) return badRequest(deviceId.error);

  const input = parseBulkCards(await readJson(request));
  if (!input.ok) return badRequest(input.error);

  const action = "カードの登録";
  try {
    // 同じidの再送は無視し、二重登録を防ぐ。
    const { error } = await createSupabaseAdminClient()
      .from("quiz_cards")
      .upsert(
        input.value.map((card) => ({
          id: card.id,
          device_id: deviceId.value,
          subject: card.subject,
          question: card.question,
          answer: card.answer,
        })),
        { onConflict: "id", ignoreDuplicates: true },
      );
    return error ? serverError(action, error) : created();
  } catch (error) {
    return serverError(action, error);
  }
}
