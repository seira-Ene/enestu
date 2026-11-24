import type { ParseResult } from "@/domain/validation";

/**
 * 文章のファイルを、端末の中で読む。
 * UTF-8で読めなければ、Excelなどで使われるShift_JISとして読む。
 */
export async function readTextFile(file: Blob): Promise<ParseResult<string>> {
  let bytes: ArrayBuffer;
  try {
    bytes = await file.arrayBuffer();
  } catch {
    return { ok: false, error: "ファイルを開けませんでした。" };
  }
  for (const encoding of ["utf-8", "shift_jis"]) {
    try {
      const text = new TextDecoder(encoding, { fatal: true }).decode(bytes);
      // 文章でないファイル（画像やPDFなど）には、この文字が含まれることが多い。
      if (text.includes("\u0000")) break;
      return { ok: true, value: text };
    } catch {
      // 次の文字コードで試す。
    }
  }
  return {
    ok: false,
    error: "文章として読めませんでした。.txt .md .csv のファイルを選んでください。",
  };
}
