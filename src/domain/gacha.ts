import { isWorldId, type WorldId } from "@/themes/types";
import { totalXp, type ProgressTotals } from "./progress";
import { fail, type ParseResult } from "./validation";

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

/** 景品の種類。素材は、キャラクターの強化に使う。 */
export type PrizeKind =
  | "material"
  | "line"
  | "title"
  | "memory"
  | "character"
  | "parallel";

const KINDS: Readonly<Record<GachaSlot, PrizeKind>> = {
  n1: "material",
  n2: "material",
  n3: "material",
  r1: "material",
  r2: "material",
  r3: "material",
  sr1: "line",
  sr2: "line",
  ssr1: "title",
  ssr2: "memory",
  ur1: "character",
  pr1: "parallel",
};

export function prizeKind(slot: GachaSlot): PrizeKind {
  return KINDS[slot];
}

/** 景品のIDを、世界線と枠に分ける。知らないIDなら null。 */
export function parseItemId(
  id: string,
): { readonly world: WorldId; readonly slot: GachaSlot } | null {
  const [world, slot, ...rest] = id.split("-");
  if (rest.length > 0 || !isWorldId(world)) return null;
  const found = GACHA_SLOTS.find((item) => item.slot === slot);
  return found === undefined ? null : { world, slot: found.slot };
}

/** 重なった景品の★。素材は★にせず、数を見せる。 */
export const MAX_STARS = 4;

export function starsOf(slot: GachaSlot, copies: number): number | null {
  if (prizeKind(slot) === "material") return null;
  return Math.min(Math.max(0, copies - 1), MAX_STARS);
}

/** 引く世界線と枚数。 */
export type PullRequest = { readonly world: WorldId; readonly count: PullCount };

export function parsePullRequest(body: unknown): ParseResult<PullRequest> {
  if (typeof body !== "object" || body === null) {
    return fail("送信内容の形式が正しくありません。");
  }
  const { world, count }: Partial<Record<keyof PullRequest, unknown>> = body;
  if (!isWorldId(world)) return fail("世界線が正しくありません。");
  const pullCount = PULL_COUNTS.find((allowed) => allowed === count);
  if (pullCount === undefined) return fail("引ける枚数は1枚か10枚です。");
  return { ok: true, value: { world, count: pullCount } };
}

/** 1回に引いた1枚。 */
export type Pull = {
  readonly seq: number;
  readonly itemId: string;
  readonly rarity: RarityId;
};

/** 持っている景品と、その数。 */
export type OwnedPrize = { readonly itemId: string; readonly copies: number };

/** 引く前の持ち物と比べ、その回で初めて手に入れた景品の、最初の1枚に印をつける。 */
export function markNew(
  pulls: readonly Pull[],
  ownedBefore: readonly OwnedPrize[],
): (Pull & { readonly isNew: boolean })[] {
  const seen = new Set(ownedBefore.map((item) => item.itemId));
  return pulls.map((pull) => {
    const isNew = !seen.has(pull.itemId);
    seen.add(pull.itemId);
    return { ...pull, isNew };
  });
}

export function isRarityId(value: unknown): value is RarityId {
  return GACHA_RARITIES.some((rarity) => rarity.id === value);
}
