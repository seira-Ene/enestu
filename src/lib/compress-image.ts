import { fitSize } from "@/domain/image-size";
import { MAX_IMAGE_BYTES } from "@/domain/note";
import type { ApiResult } from "./api-client";

/** 上から順に試し、上限に収まったものを使う。 */
const ATTEMPTS = [
  { max: 1600, quality: 0.82 },
  { max: 1600, quality: 0.65 },
  { max: 1200, quality: 0.65 },
  { max: 900, quality: 0.6 },
] as const;

/**
 * 写真を縮めてJPEGにする。描き直すので、撮影場所などの情報は残らない。
 */
export async function compressImage(file: File): Promise<ApiResult<Blob>> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return fail("この写真は読み取れませんでした。別の写真を選んでください。");
  }
  try {
    for (const { max, quality } of ATTEMPTS) {
      const blob = await draw(bitmap, max, quality);
      if (blob !== null && blob.size <= MAX_IMAGE_BYTES) {
        return { ok: true, value: blob };
      }
    }
    return fail("写真を縮められませんでした。別の写真を選んでください。");
  } finally {
    bitmap.close();
  }
}

async function draw(
  bitmap: ImageBitmap,
  max: number,
  quality: number,
): Promise<Blob | null> {
  const { width, height } = fitSize(bitmap, max);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context === null) return null;
  // 透明な部分が黒くならないようにする。
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });
}

function fail(error: string): { readonly ok: false; readonly error: string } {
  return { ok: false, error };
}
