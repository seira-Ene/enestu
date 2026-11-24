import { isWorldId, type WorldId } from "@/themes/types";
import { fail, type ParseResult } from "./validation";

export type SettingsInput = { readonly worldId: WorldId };

export function parseSettingsInput(body: unknown): ParseResult<SettingsInput> {
  if (typeof body !== "object" || body === null) {
    return fail("送信内容の形式が正しくありません。");
  }
  const { worldId }: Partial<Record<keyof SettingsInput, unknown>> = body;
  if (!isWorldId(worldId)) return fail("世界線の指定が正しくありません。");
  return { ok: true, value: { worldId } };
}
