import { describe, expect, it } from "vitest";
import {
  GACHA_PITY,
  GACHA_RARITIES,
  GACHA_SLOTS,
  gachaItemId,
  pullsUntilPity,
  rarityRank,
  rarityRates,
  ticketsEarned,
  ticketsLeft,
} from "./gacha";

describe("レアリティ", () => {
  it("6段階で、合わせて1000回あたり1000回", () => {
    expect(GACHA_RARITIES.map((rarity) => rarity.label)).toEqual([
      "ノーマル",
      "レア",
      "スペシャルレア",
      "スペシャルスーパーレア",
      "ウルトラレア",
      "パラレルレア",
    ]);
    expect(GACHA_RARITIES.reduce((sum, { weight }) => sum + weight, 0)).toBe(
      1000,
    );
  });

  it("珍しいほど、出にくい", () => {
    const weights = GACHA_RARITIES.map(({ weight }) => weight);
    expect([...weights].sort((a, b) => b - a)).toEqual(weights);
  });

  it("順位は、ノーマルが1、パラレルレアが6", () => {
    expect(rarityRank("n")).toBe(1);
    expect(rarityRank("pr")).toBe(6);
  });
});

describe("rarityRates", () => {
  const percents = (floor?: Parameters<typeof rarityRates>[0]) =>
    rarityRates(floor).map(({ id, percent }) => [id, Number(percent.toFixed(2))]);

  it("ふだんの提供割合", () => {
    expect(percents()).toEqual([
      ["n", 50],
      ["r", 30],
      ["sr", 13],
      ["ssr", 5],
      ["ur", 1.5],
      ["pr", 0.5],
    ]);
  });

  it("10連の保証と天井では、低いものを除いて割り直す", () => {
    expect(percents("sr")).toEqual([
      ["sr", 65],
      ["ssr", 25],
      ["ur", 7.5],
      ["pr", 2.5],
    ]);
    expect(percents("ur")).toEqual([
      ["ur", 75],
      ["pr", 25],
    ]);
  });
});

describe("景品の枠", () => {
  it("世界線ごとに12枠。珍しいほど少ない", () => {
    const count = (id: string) =>
      GACHA_SLOTS.filter((slot) => slot.rarity === id).length;
    expect(GACHA_RARITIES.map(({ id }) => count(id))).toEqual([3, 3, 2, 2, 1, 1]);
    expect(new Set(GACHA_SLOTS.map(({ slot }) => slot)).size).toBe(12);
  });

  it("IDは「世界線-枠」", () => {
    expect(gachaItemId("cafe", "pr1")).toBe("cafe-pr1");
  });
});

describe("券", () => {
  it("経験値60ごとに1枚。30分の学習か、12問の正解で1枚", () => {
    expect(ticketsEarned({ studySeconds: 30 * 60 - 1, correctCount: 0 })).toBe(0);
    expect(ticketsEarned({ studySeconds: 30 * 60, correctCount: 0 })).toBe(1);
    expect(ticketsEarned({ studySeconds: 0, correctCount: 11 })).toBe(0);
    expect(ticketsEarned({ studySeconds: 0, correctCount: 12 })).toBe(1);
    expect(ticketsEarned({ studySeconds: 60 * 60, correctCount: 12 })).toBe(3);
  });

  it("残りは0より少なくならない", () => {
    expect(ticketsLeft({ earned: 5, spent: 3, sinceTop: 0 })).toBe(2);
    expect(ticketsLeft({ earned: 1, spent: 3, sinceTop: 0 })).toBe(0);
  });
});

describe("pullsUntilPity", () => {
  it(`${GACHA_PITY}回目で確定。数えはじめは${GACHA_PITY}回`, () => {
    const until = (sinceTop: number) =>
      pullsUntilPity({ earned: 0, spent: 0, sinceTop });
    expect(until(0)).toBe(GACHA_PITY);
    expect(until(GACHA_PITY - 1)).toBe(1);
    expect(until(GACHA_PITY + 5)).toBe(1);
  });
});
