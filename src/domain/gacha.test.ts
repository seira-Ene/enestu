import { describe, expect, it } from "vitest";
import {
  GACHA_PITY,
  GACHA_RARITIES,
  GACHA_SLOTS,
  gachaItemId,
  gachaLimitMessage,
  highestRarity,
  markNew,
  MAX_STARS,
  parseItemId,
  parsePullRequest,
  prizeKind,
  pullSummary,
  pullsUntilPity,
  rarityRank,
  rarityRates,
  spotlightPulls,
  ticketsEarned,
  ticketsLeft,
  starsOf,
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

describe("景品の種類と★", () => {
  it("ノーマルとレアは素材、ほかはセリフや称号", () => {
    expect(GACHA_SLOTS.map(({ slot }) => prizeKind(slot))).toEqual([
      ...Array<string>(6).fill("material"),
      "line",
      "line",
      "title",
      "memory",
      "character",
      "parallel",
    ]);
  });

  it("重なるたびに★が増え、最大4つ。素材は★にしない", () => {
    expect([1, 2, 5, 6, 30].map((copies) => starsOf("sr1", copies))).toEqual([
      0,
      1,
      MAX_STARS,
      MAX_STARS,
      MAX_STARS,
    ]);
    expect(starsOf("n1", 3)).toBeNull();
  });
});

describe("parseItemId", () => {
  it("世界線と枠に分ける", () => {
    expect(parseItemId("cafe-pr1")).toEqual({ world: "cafe", slot: "pr1" });
  });

  it.each(["mars-n1", "cafe-x9", "cafe-n1-x", "cafe", ""])(
    "知らないIDは null（%s）",
    (id) => {
      expect(parseItemId(id)).toBeNull();
    },
  );
});

describe("parsePullRequest", () => {
  it.each([1, 10])("%d枚を受け付ける", (count) => {
    expect(parsePullRequest({ world: "live", count })).toEqual({
      ok: true,
      value: { world: "live", count },
    });
  });

  it.each([
    [null, "送信内容の形式が正しくありません。"],
    [{ world: "mars", count: 1 }, "世界線が正しくありません。"],
    [{ world: "live", count: 2 }, "引ける枚数は1枚か10枚です。"],
    [{ world: "live", count: "1" }, "引ける枚数は1枚か10枚です。"],
  ])("正しくない内容は断る（%j）", (body, error) => {
    expect(parsePullRequest(body)).toEqual({ ok: false, error });
  });
});

describe("markNew", () => {
  const pull = (seq: number, itemId: string) => ({ seq, itemId, rarity: "n" as const });

  it("前から持っていた景品と、この回で2枚目の景品は、新しくない", () => {
    const pulls = [pull(1, "cafe-n1"), pull(2, "cafe-n2"), pull(3, "cafe-n1")];
    const owned = [{ itemId: "cafe-n2", copies: 1 }];
    expect(markNew(pulls, owned).map(({ isNew }) => isNew)).toEqual([
      true,
      false,
      false,
    ]);
  });
});

describe("演出", () => {
  const pull = (seq: number, rarity: "n" | "r" | "sr" | "ssr" | "ur" | "pr") => ({
    seq,
    itemId: `cafe-${rarity}1`,
    rarity,
  });

  it("いちばん珍しいレアリティで色を決める", () => {
    expect(highestRarity([pull(1, "n"), pull(2, "ssr"), pull(3, "r")])).toBe("ssr");
    expect(highestRarity([pull(1, "pr"), pull(2, "ur")])).toBe("pr");
    expect(highestRarity([])).toBe("n");
  });

  it("ウルトラレア以上だけを、順に大きく見せる", () => {
    const pulls = [pull(1, "ur"), pull(2, "ssr"), pull(3, "pr"), pull(4, "n")];
    expect(spotlightPulls(pulls).map(({ seq }) => seq)).toEqual([1, 3]);
  });

  it("結果のまとめは、珍しい順に数を言う", () => {
    expect(pullSummary([pull(1, "n"), pull(2, "ur"), pull(3, "n")])).toBe(
      "3枚引きました。ウルトラレア1枚、ノーマル2枚。",
    );
  });
});

describe("gachaLimitMessage", () => {
  it("持ち主に合わせて、上限を伝える。未ログインにはログインの案内も", () => {
    expect(gachaLimitMessage("user")).toBe(
      "ガチャは24時間で1,000回までです。時間をおいてから試してください。",
    );
    expect(gachaLimitMessage("device")).toBe(
      "ガチャは24時間で100回までです。時間をおいてから試してください。ログインすると、1日1,000回まで引けます。",
    );
  });
});
