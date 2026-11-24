import "server-only";
import { noteImagePath } from "@/domain/note";
import type { SessionClient } from "./supabase/session";

export const NOTE_BUCKET = "notes";

/** 写真を送り終えないまま、これだけ経ったら諦めたとみなす。 */
const ABANDONED_AFTER_MS = 60 * 60 * 1000;
const CLEANUP_LIMIT = 20;

/**
 * 写真を先に、行を後に消す。写真が残っていると、DBが行の削除を認めない。
 * 消せた行の数を返す。
 */
export async function deleteNotes(
  db: SessionClient,
  userId: string,
  noteIds: readonly string[],
): Promise<number> {
  const removed = await db.storage
    .from(NOTE_BUCKET)
    .remove(noteIds.map((id) => noteImagePath(userId, id)));
  if (removed.error) throw removed.error;
  const { data, error } = await db
    .from("notes")
    .delete()
    .eq("user_id", userId)
    .in("id", [...noteIds])
    .select("id");
  if (error) throw error;
  return data.length;
}

/** 一覧に出ないまま件数だけを使う、送りかけのメモを片付ける。 */
export async function removeAbandonedNotes(
  db: SessionClient,
  userId: string,
  now: Date,
): Promise<void> {
  const before = new Date(now.getTime() - ABANDONED_AFTER_MS);
  const { data, error } = await db
    .from("notes")
    .select("id")
    .eq("user_id", userId)
    .is("has_image", true)
    .is("image_uploaded_at", null)
    .lt("created_at", before.toISOString())
    .limit(CLEANUP_LIMIT);
  if (error) throw error;
  if (data.length > 0) {
    await deleteNotes(
      db,
      userId,
      data.map((row) => row.id),
    );
  }
}
