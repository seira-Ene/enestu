import { parseTermDraft } from "@/domain/explanation-input";
import { parseUuid } from "@/domain/validation";
import { badRequest, readJson, serverError, success } from "@/lib/api-response";
import { resolveOwner } from "@/lib/owner";
import type { Database } from "@/lib/supabase/database.types";

type Context = RouteContext<"/api/terms/[id]">;
type TermUpdate = Database["public"]["Tables"]["explain_terms"]["Update"];

/** 用語の内容を直す。これまでの説明の結果は変わらない。 */
export async function PATCH(
  request: Request,
  context: Context,
): Promise<Response> {
  const input = parseTermDraft(await readJson(request));
  if (!input.ok) return badRequest(input.error);
  const { subject, term, keywords } = input.value;
  return updateTerm(request, context, "用語の変更", {
    subject,
    term,
    keywords: [...keywords],
  });
}

/** 用語を隠す。説明の記録を残すため、行は消さない。 */
export async function DELETE(
  request: Request,
  context: Context,
): Promise<Response> {
  return updateTerm(request, context, "用語の削除", {
    archived_at: new Date().toISOString(),
  });
}

async function updateTerm(
  request: Request,
  context: Context,
  action: string,
  values: TermUpdate,
): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;
  const { id } = await context.params;
  const termId = parseUuid(id);
  if (!termId.ok) return badRequest(termId.error);

  try {
    const { data, error } = await owner.value.db
      .from("explain_terms")
      .update(values)
      .eq("id", termId.value)
      .eq(owner.value.column, owner.value.id)
      .is("archived_at", null)
      .select("id");
    if (error) return serverError(action, error);
    if (data.length === 0) return badRequest("用語が見つかりません。");
    return success({ ok: true });
  } catch (error) {
    return serverError(action, error);
  }
}
