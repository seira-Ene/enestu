import { fail, parseText, parseUuid, type ParseResult } from "./validation";

/** 写真とメモ。 */
export type Note = {
  readonly id: string;
  readonly body: string;
  readonly createdAt: string;
  /** 期限つきの写真のURL。写真がないか、取れなければ null。 */
  readonly imageUrl: string | null;
  readonly hasImage: boolean;
};

export type NoteInput = {
  readonly id: string;
  readonly body: string;
};

export type NoteImageType = "image/jpeg" | "image/webp";

/** 上限は、DBと写真の置き場の設定と合わせる。 */
export const MAX_NOTES = 200;
export const MAX_NOTE_LENGTH = 500;
export const MAX_IMAGE_BYTES = 1024 * 1024;

export function parseNoteInput(
  id: unknown,
  body: unknown,
  hasImage: boolean,
): ParseResult<NoteInput> {
  const parsedId = parseUuid(id);
  if (!parsedId.ok) return parsedId;
  const parsedBody = parseText(body, {
    label: "メモ",
    max: MAX_NOTE_LENGTH,
    multiline: true,
    allowEmpty: true,
  });
  if (!parsedBody.ok) return parsedBody;
  if (parsedBody.value === "" && !hasImage) {
    return fail("メモを書くか、写真を選んでください。");
  }
  return { ok: true, value: { id: parsedId.value, body: parsedBody.value } };
}

/** 名乗った種類を信じず、先頭のバイトで見分ける。使えない種類なら null。 */
export function detectImageType(bytes: Uint8Array): NoteImageType | null {
  if (matches(bytes, 0, [0xff, 0xd8, 0xff])) return "image/jpeg";
  const isRiff = matches(bytes, 0, [0x52, 0x49, 0x46, 0x46]);
  const isWebp = matches(bytes, 8, [0x57, 0x45, 0x42, 0x50]);
  return isRiff && isWebp ? "image/webp" : null;
}

export function parseNoteImage(bytes: Uint8Array): ParseResult<NoteImageType> {
  if (bytes.length > MAX_IMAGE_BYTES) {
    return fail("写真が大きすぎます。1MBまで送れます。");
  }
  const type = detectImageType(bytes);
  return type === null
    ? fail("写真はJPEGかWebPで送ってください。")
    : { ok: true, value: type };
}

/** 写真の置き場での名前。DBの許可と同じ形にすること。 */
export function noteImagePath(userId: string, noteId: string): string {
  return `${userId}/${noteId}`;
}

function matches(
  bytes: Uint8Array,
  offset: number,
  expected: readonly number[],
): boolean {
  return expected.every((byte, index) => bytes[offset + index] === byte);
}
