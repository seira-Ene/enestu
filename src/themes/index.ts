import { cafe } from "./cafe";
import { detective } from "./detective";
import { dungeon } from "./dungeon";
import { live } from "./live";
import { otome } from "./otome";
import { WORLD_IDS, type WorldId, type WorldTheme } from "./types";

export const themes: Readonly<Record<WorldId, WorldTheme>> = {
  dungeon,
  otome,
  detective,
  live,
  cafe,
};

export const DEFAULT_WORLD_ID: WorldId = "dungeon";

/** 世界線の見た目を、globals.css が参照するCSSの宣言にする。 */
export function themeToCssVars({
  colors,
  decor,
}: WorldTheme): Readonly<Record<string, string>> {
  return {
    "--theme-primary": colors.primary,
    "--theme-background": colors.background,
    "--theme-surface": colors.surface,
    "--theme-text": colors.text,
    "--theme-accent": colors.accent,
    "--decor-radius": decor.radius,
    "--decor-button-radius": decor.buttonRadius,
    "--decor-panel-border": decor.panelBorder,
    "--decor-panel-shadow": decor.panelShadow,
    "--decor-button-shadow": decor.buttonShadow,
    "--decor-ornament": `"${decor.ornament}"`,
    "color-scheme": decor.colorScheme,
  };
}

/**
 * 全世界線の見た目を、data-world 属性で切り替わるCSSにする。
 * 属性を変えるだけで切り替わるため、描画前に選択を反映できる。
 */
export function worldsToCss(): string {
  return WORLD_IDS.map((id) => {
    const declarations = Object.entries(themeToCssVars(themes[id]))
      .map(([name, value]) => `${name}:${value}`)
      .join(";");
    return `[data-world="${id}"]{${declarations}}`;
  }).join("\n");
}
