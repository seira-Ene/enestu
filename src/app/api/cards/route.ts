import type { QuizCard } from "@/domain/quiz";
import { parseQuizCardInput } from "@/domain/quiz-input";
import {
  badRequest,
  created,
  readDeviceId,
  readJson,
  serverError,
  success,
} from "@/lib/api-response";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/** 一問一答カードを1枚登録する。 */
export async function POST(request: Request): Promise<Response> {
  const deviceId = readDeviceId(request);
  if (!deviceId.ok) return badRequest(deviceId.error);

  const input = parseQuizCardInput(await readJson(request));
  if (!input.ok) return badRequest(input.error);

  const action = "カードの登録";
  try {
    // 同じidの再送は無視し、二重登録を防ぐ。
    const { error } = await createSupabaseAdminClient()
      .from("quiz_cards")
      .upsert(
        {
          id: input.value.id,
          device_id: deviceId.value,
          subject: input.value.subject,
          question: input.value.question,
          answer: input.value.answer,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
    return error ? serverError(action, error) : created();
  } catch (error) {
    return serverError(action, error);
  }
}

/** この端末のカードを新しい順に返す。隠したカードは含まない。 */
export async function GET(request: Request): Promise<Response> {
  const deviceId = readDeviceId(request);
  if (!deviceId.ok) return badRequest(deviceId.error);

  const action = "カードの取得";
  try {
    const { data, error } = await createSupabaseAdminClient()
      .from("quiz_cards")
      .select("id, subject, question, answer")
      .eq("device_id", deviceId.value)
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
