import { dungeon } from "./dungeon";
import type { ThemeCssVars, WorldId, WorldTheme } from "./types";

/** 実装済みの世界線。第4週に5つすべてを登録し、Partial を外す。 */
export const themes = {
  dungeon,
} as const satisfies Partial<Record<WorldId, WorldTheme>>;

export type AvailableWorldId = keyof typeof themes;

export const DEFAULT_WORLD_ID: AvailableWorldId = "dungeon";

/** 世界線の配色を、globals.css が参照するCSS変数へ変換する。 */
export function themeToCssVars(theme: WorldTheme): ThemeCssVars {
  return {
    "--theme-primary": theme.colors.primary,
    "--theme-background": theme.colors.background,
    "--theme-surface": theme.colors.surface,
    "--theme-text": theme.colors.text,
    "--theme-accent": theme.colors.accent,
  };
}
