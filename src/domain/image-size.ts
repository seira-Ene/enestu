export type Size = { readonly width: number; readonly height: number };

/** 縦横の比を保ち、長い辺を max 以下にする。小さい写真は大きくしない。 */
export function fitSize({ width, height }: Size, max: number): Size {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
