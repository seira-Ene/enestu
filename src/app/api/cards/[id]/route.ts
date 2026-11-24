import { parseCardDraft } from "@/domain/quiz-input";
import { parseUuid } from "@/domain/validation";
import {
  badRequest,
  readDeviceId,
  readJson,
  serverError,
  success,
} from "@/lib/api-response";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type Context = RouteContext<"/api/cards/[id]">;
type CardUpdate = Database["public"]["Tables"]["quiz_cards"]["Update"];

/** カードの内容を直す。 */
export async function PATCH(
  request: Request,
  context: Context,
): Promise<Response> {
  const input = parseCardDraft(await readJson(request));
  if (!input.ok) return badRequest(input.error);
  return updateCard(request, context, "カードの変更", input.value);
}

/** カードを隠す。解答の記録を残すため、行は消さない。 */
export async function DELETE(
  request: Request,
  context: Context,
): Promise<Response> {
  return updateCard(request, context, "カードの削除", {
    archived_at: new Date().toISOString(),
  });
}

async function updateCard(
  request: Request,
  context: Context,
  action: string,
  values: CardUpdate,
): Promise<Response> {
  const deviceId = readDeviceId(request);
  if (!deviceId.ok) return badRequest(deviceId.error);
  const { id } = await context.params;
  const cardId = parseUuid(id);
  if (!cardId.ok) return badRequest(cardId.error);

  try {
    const { data, error } = await createSupabaseAdminClient()
      .from("quiz_cards")
      .update(values)
      .eq("id", cardId.value)
      .eq("device_id", deviceId.value)
      .is("archived_at", null)
      .select("id");
    if (error) return serverError(action, error);
    if (data.length === 0) return badRequest("カードが見つかりません。");
    return success({ ok: true });
  } catch (error) {
    return serverError(action, error);
  }
}
