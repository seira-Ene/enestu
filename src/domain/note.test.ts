import { describe, expect, it } from "vitest";
import {
  detectImageType,
  MAX_IMAGE_BYTES,
  MAX_NOTE_LENGTH,
  noteImagePath,
  parseNoteImage,
  parseNoteInput,
} from "./note";

const ID = "11111111-1111-4111-8111-111111111111";
const JPEG = [0xff, 0xd8, 0xff, 0xe0];
const WEBP = [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50];

describe("parseNoteInput", () => {
  it("前後の空白を除き、途中の改行を残す", () => {
    expect(parseNoteInput(ID, " 極限の\r\n定義 \n", false)).toEqual({
      ok: true,
      value: { id: ID, body: "極限の\n定義" },
    });
  });

  it("写真があれば、文章は空でよい", () => {
    expect(parseNoteInput(ID, "", true)).toEqual({
      ok: true,
      value: { id: ID, body: "" },
    });
  });

  it.each(["", " \n ", "　"])("写真がなければ「%s」は拒否する", (body) => {
    expect(parseNoteInput(ID, body, false).ok).toBe(false);
  });

  it("文字数の上限を、絵文字も1文字として数える", () => {
    expect(parseNoteInput(ID, "😀".repeat(MAX_NOTE_LENGTH), false).ok).toBe(
      true,
    );
    expect(parseNoteInput(ID, "あ".repeat(MAX_NOTE_LENGTH + 1), true).ok).toBe(
      false,
    );
  });

  it.each([
    ["IDがない", null, "メモ"],
    ["IDがUUIDでない", "note", "メモ"],
    ["文章がない", ID, null],
    ["文章がファイル", ID, {}],
    ["制御文字", ID, "a\u0007b"],
  ])("%s なら拒否する", (_label, id, body) => {
    expect(parseNoteInput(id, body, true).ok).toBe(false);
  });
});

describe("detectImageType", () => {
  it("JPEGとWebPを見分ける", () => {
    expect(detectImageType(Uint8Array.from(JPEG))).toBe("image/jpeg");
    expect(detectImageType(Uint8Array.from(WEBP))).toBe("image/webp");
  });

  it.each([
    ["空", []],
    ["短すぎるJPEG", JPEG.slice(0, 2)],
    ["短すぎるWebP", WEBP.slice(0, 11)],
    ["PNG", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    ["GIF", [0x47, 0x49, 0x46, 0x38]],
    ["RIFFの音声", [...WEBP.slice(0, 8), 0x57, 0x41, 0x56, 0x45]],
    ["SVG", [...new TextEncoder().encode("<svg onload=alert(1)>")]],
    ["HTML", [...new TextEncoder().encode("<html>")]],
  ])("%s は受け付けない", (_label, bytes) => {
    expect(detectImageType(Uint8Array.from(bytes))).toBeNull();
  });
});

describe("parseNoteImage", () => {
  const jpegOf = (size: number) => {
    const bytes = new Uint8Array(size);
    bytes.set(JPEG);
    return bytes;
  };

  it("1MBちょうどまで受け付ける", () => {
    expect(parseNoteImage(jpegOf(MAX_IMAGE_BYTES))).toEqual({
      ok: true,
      value: "image/jpeg",
    });
    expect(parseNoteImage(jpegOf(MAX_IMAGE_BYTES + 1)).ok).toBe(false);
  });

  it("使えない種類は拒否する", () => {
    expect(parseNoteImage(new Uint8Array(0)).ok).toBe(false);
  });
});

describe("noteImagePath", () => {
  it("利用者のIDとメモのIDをつなぐ", () => {
    expect(noteImagePath("user", "note")).toBe("user/note");
  });
});
