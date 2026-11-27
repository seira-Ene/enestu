import type { DailyClaim, DailyReward } from "@/domain/daily";
import { GACHA_RARITIES, parseItemId } from "@/domain/gacha";
import { themes } from "@/themes";

/** 受け取る前に見せる報酬（例：「券1枚」「レアの素材」）。 */
export function rewardPreview(reward: DailyReward): string {
  const parts: string[] = [];
  if (reward.tickets > 0) parts.push(`券${reward.tickets}枚`);
  if (reward.material !== null) {
    const label = GACHA_RARITIES.find(({ id }) => id === reward.material)?.label;
    parts.push(`${label ?? ""}の素材`);
  }
  return parts.join("と");
}

/** 受け取った報酬（例：「券1枚、素材「迷宮の鍵束」」）。 */
export function rewardText(claim: DailyClaim): string {
  const parsed = claim.itemId === null ? null : parseItemId(claim.itemId);
  const material =
    parsed === null
      ? null
      : `素材「${themes[parsed.world].gacha.prizes[parsed.slot].name}」`;
  const tickets = claim.tickets > 0 ? `券${claim.tickets}枚` : null;
  return [tickets, material].filter((part) => part !== null).join("、");
}
