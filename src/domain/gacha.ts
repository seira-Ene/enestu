import type { WorldId } from "@/themes/types";
import { totalXp, type ProgressTotals } from "./progress";

/**
 * 学習の成果だけで引ける、無料のガチャ。
 * 値は supabase/migrations の gacha_rarities・gacha_items・くじの関数と合わせる。
 */

/** 珍しくない順。weight は1000回あたりの回数。 */
export const GACHA_RARITIES = [
  { id: "n", label: "ノーマル", short: "N", weight: 500 },
  { id: "r", label: "レア", short: "R", weight: 300 },
  { id: "sr", label: "スペシャルレア", short: "SR", weight: 130 },
  { id: "ssr", label: "スペシャルスーパーレア", short: "SSR", weight: 50 },
  { id: "ur", label: "ウルトラレア", short: "UR", weight: 15 },
  { id: "pr", label: "パラレルレア", short: "PR", weight: 5 },
] as const;

export type Rarity = (typeof GACHA_RARITIES)[number];
export type RarityId = Rarity["id"];

/** 経験値がこれだけたまるごとに、券を1枚もらえる。 */
export const XP_PER_TICKET = 60;

/** ウルトラレア以上が出ないまま、この回数目を引くと、ウルトラレア以上が出る。 */
export const GACHA_PITY = 100;

/** 10連のうち1枚は、少なくともこのレアリティにする。 */
export const TEN_PULL_FLOOR: RarityId = "sr";
/** 天井で出すレアリティ。 */
export const PITY_FLOOR: RarityId = "ur";

/** 1回に引ける枚数。単発と10連。 */
export const PULL_COUNTS = [1, 10] as const;
export type PullCount = (typeof PULL_COUNTS)[number];

/** 世界線ごとの景品の枠。どの世界線も、この12枠を持つ。 */
export const GACHA_SLOTS = [
  { slot: "n1", rarity: "n" },
  { slot: "n2", rarity: "n" },
  { slot: "n3", rarity: "n" },
  { slot: "r1", rarity: "r" },
  { slot: "r2", rarity: "r" },
  { slot: "r3", rarity: "r" },
  { slot: "sr1", rarity: "sr" },
  { slot: "sr2", rarity: "sr" },
  { slot: "ssr1", rarity: "ssr" },
  { slot: "ssr2", rarity: "ssr" },
  { slot: "ur1", rarity: "ur" },
  { slot: "pr1", rarity: "pr" },
] as const satisfies readonly { slot: string; rarity: RarityId }[];

export type GachaSlot = (typeof GACHA_SLOTS)[number]["slot"];

export function gachaItemId(world: WorldId, slot: GachaSlot): string {
  return `${world}-${slot}`;
}

/** 珍しさの順位。ノーマルが1。 */
export function rarityRank(id: RarityId): number {
  return GACHA_RARITIES.findIndex((rarity) => rarity.id === id) + 1;
}

export function ticketsEarned(totals: ProgressTotals): number {
  return Math.floor(totalXp(totals) / XP_PER_TICKET);
}

/** DBが数えた、券と天井の状態。 */
export type GachaStatus = {
  readonly earned: number;
  readonly spent: number;
  /** ウルトラレア以上が最後に出てから、引いた回数。 */
  readonly sinceTop: number;
};

/** 記録を消すと、もらった券が使った券より少なくなることがある。 */
export function ticketsLeft({ earned, spent }: GachaStatus): number {
  return Math.max(0, earned - spent);
}

/** あと何回引けば、ウルトラレア以上が出るか（その回を含む）。 */
export function pullsUntilPity({ sinceTop }: GachaStatus): number {
  return Math.max(1, GACHA_PITY - sinceTop);
}

/** 画面に出す提供割合（%）。floor より低いレアリティは出ない。 */
export function rarityRates(
  floor: RarityId = "n",
): { readonly id: RarityId; readonly percent: number }[] {
  const pool = GACHA_RARITIES.filter(
    (rarity) => rarityRank(rarity.id) >= rarityRank(floor),
  );
  const total = pool.reduce((sum, rarity) => sum + rarity.weight, 0);
  return pool.map((rarity) => ({
    id: rarity.id,
    percent: (rarity.weight / total) * 100,
  }));
}
