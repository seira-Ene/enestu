import { parseUuid } from "@/domain/validation";
import {
  badRequest,
  loginRequired,
  serverError,
  success,
} from "@/lib/api-response";
import { deleteNotes } from "@/lib/notes-store";
import { resolveOwner } from "@/lib/owner";

/** メモを写真ごと消す。元には戻せない。 */
export async function DELETE(
  request: Request,
  context: RouteContext<"/api/notes/[id]">,
): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;
  if (owner.value.kind !== "user") return loginRequired();
  const { id } = await context.params;
  const noteId = parseUuid(id);
  if (!noteId.ok) return badRequest(noteId.error);

  try {
    const { db, id: userId } = owner.value;
    const deleted = await deleteNotes(db, userId, [noteId.value]);
    if (deleted === 0) return badRequest("メモが見つかりません。");
    return success({ ok: true });
  } catch (error) {
    return serverError("メモの削除", error);
  }
}
