import { describe, expect, it } from "vitest";
import { DEFAULT_WORLD_ID, themes, themeToCssVars, worldsToCss } from "@/themes";
import { isWorldId, WORLD_IDS, type HexColor } from "@/themes/types";

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "object" && value !== null) {
    return Object.values(value).flatMap(collectStrings);
  }
  return [];
}

/** WCAGの相対輝度。 */
function luminance(color: HexColor): number {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = Number.parseInt(color.slice(start, start + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function contrast(a: HexColor, b: HexColor): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

describe.each(WORLD_IDS)("世界線 %s", (id) => {
  const theme = themes[id];

  it("登録キーとidが一致する", () => {
    expect(theme.id).toBe(id);
  });

  it("空欄の項目がない", () => {
    const values = collectStrings(theme);
    expect(values.length).toBeGreaterThan(50);
    expect(values.filter((v) => v.trim() === "")).toEqual([]);
  });

  it("配色がすべて6桁の16進カラーである", () => {
    for (const color of Object.values(theme.colors)) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("文字と背景の明暗差が4.5:1以上ある", () => {
    const { primary, background, surface, text, accent } = theme.colors;
    for (const ink of [text, primary, accent]) {
      expect(contrast(ink, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(ink, surface)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("CSSを壊す文字を含まない", () => {
    for (const value of Object.values(themeToCssVars(theme))) {
      expect(value).not.toMatch(/[;{}<\\]/);
    }
  });
});

describe("世界線どうしの違い", () => {
  it("名前・キャラ・配色・飾りが重ならない", () => {
    const all = WORLD_IDS.map((id) => themes[id]);
    for (const pick of [
      all.map((t) => t.displayName),
      all.map((t) => t.character.name),
      all.map((t) => t.colors.primary),
      all.map((t) => t.colors.background),
      all.map((t) => t.decor.ornament),
      all.map((t) => t.quiz.stage.gaugeLabel),
    ]) {
      expect(new Set(pick).size).toBe(WORLD_IDS.length);
    }
  });
});

describe("worldsToCss", () => {
  it("全世界線のCSSを出力する", () => {
    const css = worldsToCss();
    for (const id of WORLD_IDS) {
      expect(css).toContain(`[data-world="${id}"]{`);
      expect(css).toContain(`--theme-primary:${themes[id].colors.primary}`);
    }
  });
});

describe("isWorldId", () => {
  it("既知の世界線だけを受け付ける", () => {
    expect(WORLD_IDS.every(isWorldId)).toBe(true);
    expect(isWorldId(DEFAULT_WORLD_ID)).toBe(true);
    for (const value of ["", "space", null, undefined, 1, "__proto__"]) {
      expect(isWorldId(value)).toBe(false);
    }
  });
});
