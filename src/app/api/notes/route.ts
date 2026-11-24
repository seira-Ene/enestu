import {
  MAX_NOTES,
  noteImagePath,
  parseNoteImage,
  parseNoteInput,
  type Note,
  type NoteImageType,
} from "@/domain/note";
import {
  badRequest,
  created,
  loginRequired,
  readFormData,
  serverError,
  success,
} from "@/lib/api-response";
import { NOTE_BUCKET, removeAbandonedNotes } from "@/lib/notes-store";
import { resolveOwner } from "@/lib/owner";

/** 一覧を取り直す前に切れないよう、長めにする。 */
const IMAGE_URL_SECONDS = 60 * 60;
/** DBのトリガーが、件数の上限で返す文。 */
const LIMIT_MESSAGE = "notes_limit";
/** 同じ名前の写真が、もう置いてある。 */
const DUPLICATE_STATUS = "409";

/** 写真とメモを1件保存する。同じidで送り直すと、途中から続けられる。 */
export async function POST(request: Request): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;
  if (owner.value.kind !== "user") return loginRequired();
  const { db, id: userId } = owner.value;

  const form = await readFormData(request);
  const file = form?.get("image") ?? null;
  const image = file instanceof File ? await readImage(file) : null;
  if (file !== null && image === null) {
    return badRequest("写真を読み取れませんでした。");
  }
  if (image !== null && !image.ok) return badRequest(image.error);
  const input = parseNoteInput(
    form?.get("id"),
    form?.get("body"),
    image !== null,
  );
  if (!input.ok) return badRequest(input.error);

  const action = "メモの保存";
  try {
    await removeAbandonedNotes(db, userId, new Date());
    const { error } = await db.from("notes").upsert(
      {
        id: input.value.id,
        user_id: userId,
        body: input.value.body,
        has_image: image !== null,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
    if (error?.message === LIMIT_MESSAGE) {
      return badRequest(
        `メモは${MAX_NOTES}件までです。古いメモを消してから送ってください。`,
      );
    }
    if (error) return serverError(action, error);
    if (image === null) return created();

    const upload = await db.storage
      .from(NOTE_BUCKET)
      .upload(noteImagePath(userId, input.value.id), image.bytes, {
        contentType: image.type,
      });
    if (upload.error && !isDuplicate(upload.error)) {
      return serverError(action, upload.error);
    }
    const marked = await db
      .from("notes")
      .update({ image_uploaded_at: new Date().toISOString() })
      .eq("id", input.value.id)
      .eq("user_id", userId)
      .is("image_uploaded_at", null);
    return marked.error ? serverError(action, marked.error) : created();
  } catch (error) {
    return serverError(action, error);
  }
}

/** 自分のメモを新しい順に返す。写真を送り終えていないものは含まない。 */
export async function GET(request: Request): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;
  if (owner.value.kind !== "user") return loginRequired();
  const { db, id: userId } = owner.value;

  const action = "メモの取得";
  try {
    const { data, error } = await db
      .from("notes")
      .select("id, body, has_image, created_at")
      .eq("user_id", userId)
      .or("has_image.is.false,image_uploaded_at.not.is.null")
      .order("created_at", { ascending: false })
      .limit(MAX_NOTES);
    if (error) return serverError(action, error);

    const paths = data
      .filter((row) => row.has_image)
      .map((row) => noteImagePath(userId, row.id));
    const urls = new Map<string, string>();
    if (paths.length > 0) {
      const signed = await db.storage
        .from(NOTE_BUCKET)
        .createSignedUrls(paths, IMAGE_URL_SECONDS);
      if (signed.error) return serverError(action, signed.error);
      for (const { path, signedUrl } of signed.data) {
        if (path !== null && signedUrl) urls.set(path, signedUrl);
      }
    }

    const notes: Note[] = data.map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: row.created_at,
      hasImage: row.has_image,
      imageUrl: urls.get(noteImagePath(userId, row.id)) ?? null,
    }));
    return success({ notes });
  } catch (error) {
    return serverError(action, error);
  }
}

type ReadImage =
  | { readonly ok: true; readonly bytes: Uint8Array; readonly type: NoteImageType }
  | { readonly ok: false; readonly error: string };

async function readImage(file: File): Promise<ReadImage> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = parseNoteImage(bytes);
  return type.ok ? { ok: true, bytes, type: type.value } : type;
}

function isDuplicate(error: object): boolean {
  return "statusCode" in error && error.statusCode === DUPLICATE_STATUS;
}
