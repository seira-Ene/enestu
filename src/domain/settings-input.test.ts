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
    null,
    undefined,
    "cafe",
    [],
    {},
    { worldId: "space" },
    { worldId: 1 },
  ])("%j を拒否する", (body) => {
    expect(parseSettingsInput(body).ok).toBe(false);
  });
});
