import { isWorldId, type WorldId } from "@/themes/types";
import { parseHeroName } from "./hero-name";
import { fail, type ParseResult } from "./validation";

/** 保存してある設定。まだ選んでいなければ null。 */
export type Settings = {
  readonly worldId: WorldId | null;
  readonly heroName: string | null;
};

/** 変える項目だけを含む。 */
export type SettingsInput = {
  readonly worldId?: WorldId;
  /** null なら、名前を消す。 */
  readonly heroName?: string | null;
};

export function parseSettingsInput(body: unknown): ParseResult<SettingsInput> {
  if (typeof body !== "object" || body === null) {
    return fail("送信内容の形式が正しくありません。");
  }
  const { worldId, heroName }: Partial<Record<keyof SettingsInput, unknown>> =
    body;
  if (worldId === undefined && heroName === undefined) {
    return fail("変える設定がありません。");
  }
  if (worldId !== undefined && !isWorldId(worldId)) {
    return fail("世界線の指定が正しくありません。");
  }
  if (heroName === undefined) return { ok: true, value: { worldId } };
  const name = parseHeroName(heroName);
  if (!name.ok) return name;
  return {
    ok: true,
    value:
      worldId === undefined
        ? { heroName: name.value }
        : { worldId, heroName: name.value },
  };
}
