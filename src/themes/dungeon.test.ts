import { describe, expect, it } from "vitest";
import { themes, themeToCssVars } from "@/themes";
import { WORLD_IDS } from "@/themes/types";

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "object" && value !== null) {
    return Object.values(value).flatMap(collectStrings);
  }
  return [];
}

describe("ダンジョン世界線", () => {
  const theme = themes.dungeon;

  it("登録キーとidが一致し、既知の世界線である", () => {
    expect(theme.id).toBe("dungeon");
    expect(WORLD_IDS).toContain(theme.id);
  });

  it("空欄の項目がない", () => {
    const values = collectStrings(theme);
    expect(values.length).toBeGreaterThan(0);
    expect(values.filter((v) => v.trim() === "")).toEqual([]);
  });

  it("配色がすべて6桁の16進カラーである", () => {
    for (const color of Object.values(theme.colors)) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("配色がすべてCSS変数へ変換される", () => {
    expect(themeToCssVars(theme)).toEqual(
      Object.fromEntries(
        Object.entries(theme.colors).map(([k, v]) => [`--theme-${k}`, v]),
      ),
    );
  });
});
