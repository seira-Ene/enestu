import { describe, expect, it } from "vitest";
import { WORLD_IDS } from "@/themes/types";
import { parseSettingsInput } from "./settings-input";

describe("parseSettingsInput", () => {
  it.each(WORLD_IDS)("%s を受け取り、余分な項目は捨てる", (worldId) => {
    expect(parseSettingsInput({ worldId, extra: 1 })).toEqual({
      ok: true,
      value: { worldId },
    });
  });

  it.each([
    [{ heroName: " そら " }, { heroName: "そら" }],
    [{ heroName: null }, { heroName: null }],
    [{ heroName: "" }, { heroName: null }],
    [
      { worldId: "cafe", heroName: "そら" },
      { worldId: "cafe", heroName: "そら" },
    ],
  ])("%j から、変える項目だけを取り出す", (body, value) => {
    expect(parseSettingsInput(body)).toEqual({ ok: true, value });
  });

  it.each([
    null,
    undefined,
    "cafe",
    [],
    {},
    { worldId: "space" },
    { worldId: 1 },
    { worldId: null },
    { heroName: 1 },
    { heroName: "あ".repeat(13) },
    { worldId: "space", heroName: "そら" },
    { worldId: "cafe", heroName: "そ\nら" },
  ])("%j を拒否する", (body) => {
    expect(parseSettingsInput(body).ok).toBe(false);
  });
});
