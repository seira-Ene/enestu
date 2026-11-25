import type { Note } from "@/domain/note";
import {
  deleteResource,
  getField,
  getList,
  postForm,
  type ApiResult,
} from "./api-client";

const ENDPOINT = "/api/notes";
/** 写真のURLの期限（1時間）より前に、新しいものへ替える。 */
const IMAGE_URL_REUSE_MS = 45 * 60 * 1000;

type CachedUrl = { readonly url: string; readonly fetchedAt: number };
/** 取り直すたびにURLが変わって写真を読み込み直すのを防ぐ。 */
const imageUrls = new Map<string, CachedUrl>();

export async function fetchNotes(): Promise<ApiResult<Note[]>> {
  const result = await getList(ENDPOINT, "notes", isNote);
  if (!result.ok) return result;
  const now = Date.now();
  return {
    ok: true,
    value: result.value.map((note) => ({
      ...note,
      imageUrl: reuseImageUrl(note, now),
    })),
  };
}

export function saveNote(
  id: string,
  body: string,
  image: Blob | null,
): Promise<ApiResult<null>> {
  const form = new FormData();
  form.set("id", id);
  form.set("body", body);
  if (image !== null) form.set("image", image, "note.jpg");
  return postForm(ENDPOINT, form);
}

export async function deleteNote(id: string): Promise<ApiResult<null>> {
  const result = await deleteResource(`${ENDPOINT}/${encodeURIComponent(id)}`);
  if (result.ok) imageUrls.delete(id);
  return result;
}

/** 即時同期の合図を受け取るための鍵。保存しないこと。 */
export function fetchRealtimeToken(): Promise<ApiResult<string>> {
  return getField(
    "/api/realtime-token",
    "token",
    (value) => typeof value === "string",
  );
}

function reuseImageUrl(note: Note, now: number): string | null {
  const cached = imageUrls.get(note.id);
  if (cached !== undefined && now - cached.fetchedAt < IMAGE_URL_REUSE_MS) {
    return cached.url;
  }
  if (note.imageUrl !== null) {
    imageUrls.set(note.id, { url: note.imageUrl, fetchedAt: now });
  }
  return note.imageUrl;
}

function isNote(value: unknown): value is Note {
  if (typeof value !== "object" || value === null) return false;
  const fields: Partial<Record<keyof Note, unknown>> = value;
  return (
    typeof fields.id === "string" &&
    typeof fields.body === "string" &&
    typeof fields.createdAt === "string" &&
    typeof fields.hasImage === "boolean" &&
    (fields.imageUrl === null || typeof fields.imageUrl === "string")
  );
}
