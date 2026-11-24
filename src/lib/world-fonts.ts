import type { WorldId } from "@/themes/types";

/**
 * 世界線のフォント。日本語フォントは宣言だけでも大きいため、
 * 選んだ世界線の分だけを読み込む。
 */
const LOADERS: Readonly<
  Record<WorldId, () => Promise<{ font: { variable: string } }>>
> = {
  dungeon: () => import("./fonts/dungeon"),
  otome: () => import("./fonts/otome"),
  detective: () => import("./fonts/detective"),
  live: () => import("./fonts/live"),
  cafe: () => import("./fonts/cafe"),
};

/** フォントを有効にするクラス名を返す。読み込めなければ null。 */
export async function loadWorldFont(worldId: WorldId): Promise<string | null> {
  try {
    const { font } = await LOADERS[worldId]();
    return font.variable;
  } catch {
    // フォントがなくても標準の書体で使えるため、失敗は無視する。
    return null;
  }
}
