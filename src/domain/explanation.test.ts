import { describe, expect, it } from "vitest";
import {
  averageBySubject,
  isKeywordList,
  judgeExplanation,
  keywordVariants,
  rankExplanation,
  suggestTerm,
  understandingPercent,
  type ExplainTerm,
  type ExplanationLog,
} from "./explanation";

describe("keywordVariants", () => {
  it.each([
    ["固有値", ["固有値"]],
    ["線形変換/一次変換", ["線形変換", "一次変換"]],
    // 全角の区切り、空白、大文字をそろえる。
    ["線形 変換／ＡＢＣ", ["線形変換", "abc"]],
    ["/固有値//", ["固有値"]],
    ["/", []],
  ])("「%s」を言い換えに分ける", (keyword, variants) => {
    expect(keywordVariants(keyword)).toEqual(variants);
  });
});

describe("judgeExplanation", () => {
  const keywords = ["向きが変わらない", "線形変換/一次変換", "Av=λv"];

  it("含まれる観点と、足りない観点を分ける", () => {
    expect(
      judgeExplanation("一次変換しても向きが変わらないベクトル", keywords),
    ).toEqual({
      matched: ["向きが変わらない", "線形変換/一次変換"],
      missing: ["Av=λv"],
    });
  });

  it.each([
    ["全角", "Ａｖ＝λｖ を満たす"],
    ["空白と改行", "A v =\n λ v を満たす"],
    ["大文字", "AV=ΛV を満たす"],
  ])("%s の違いを無視する", (_label, body) => {
    expect(judgeExplanation(body, ["Av=λv"]).matched).toEqual(["Av=λv"]);
  });

  it.each(["", "  \n"])("空の説明は、すべて足りない", (body) => {
    expect(judgeExplanation(body, keywords)).toEqual({
      matched: [],
      missing: keywords,
    });
  });

  it("中身のない観点は、何にも含まれない", () => {
    expect(judgeExplanation("何でも", ["/"])).toEqual({
      matched: [],
      missing: ["/"],
    });
  });
});

describe("understandingPercent と rankExplanation", () => {
  it.each([
    [3, 0, 100, "great"],
    [5, 1, 80, "great"],
    [3, 1, 67, "good"],
    [5, 3, 40, "good"],
    [3, 2, 33, "retry"],
    [1, 1, 0, "retry"],
    [0, 0, 0, "retry"],
  ])("%i個中%i個足りなければ %i%%（%s）", (total, missing, percent, rank) => {
    expect(understandingPercent(total, missing)).toBe(percent);
    expect(rankExplanation(percent)).toBe(rank);
  });

  it.each([
    [79, "good"],
    [80, "great"],
    [39, "retry"],
    [40, "good"],
  ])("境目の %i%% は %s", (percent, rank) => {
    expect(rankExplanation(percent)).toBe(rank);
  });
});

describe("isKeywordList", () => {
  const keywords = ["光合成", "二酸化炭素/CO2", "酸素"];

  it.each([
    "光合成、二酸化炭素、酸素",
    "光合成 CO2 酸素",
    "光合成・酸素",
    "光合成",
  ])("「%s」は羅列とみなす", (body) => {
    expect(isKeywordList(body, keywords)).toBe(true);
  });

  it.each([
    "光合成とは、植物が二酸化炭素と水から養分を作り、酸素を出すはたらき。",
    "植物が養分を作ること",
    "",
    "、。",
  ])("「%s」は羅列とみなさない", (body) => {
    expect(isKeywordList(body, keywords)).toBe(false);
  });
});

const term = (id: string, subject = "数学"): ExplainTerm => ({
  id,
  subject,
  term: id,
  keywords: ["k"],
});
const log = (
  termId: string,
  totalCount = 2,
  missing: readonly string[] = [],
): ExplanationLog => ({
  id: `log-${termId}`,
  termId,
  body: "x",
  totalCount,
  missing,
  explainedAt: "2026-12-01T00:00:00Z",
});

describe("suggestTerm", () => {
  const terms = [term("a"), term("b"), term("c")];

  it("まだ説明していない用語を先に選ぶ", () => {
    expect(suggestTerm(terms, [])?.id).toBe("a");
    expect(suggestTerm(terms, [log("a")])?.id).toBe("b");
  });

  it("すべて説明していれば、いちばん前に説明したものを選ぶ", () => {
    const logs = [log("a"), log("c"), log("b"), log("a")];
    expect(suggestTerm(terms, logs)?.id).toBe("b");
  });

  it("除く用語は、ほかになければ選ぶ", () => {
    expect(suggestTerm(terms, [], "a")?.id).toBe("b");
    expect(suggestTerm([term("a")], [], "a")?.id).toBe("a");
  });

  it("用語がなければ null", () => {
    expect(suggestTerm([], [log("a")])).toBeNull();
  });
});

describe("averageBySubject", () => {
  it("科目ごとに平均し、低い順に並べる", () => {
    const terms = [term("a"), term("b"), term("c", "英語")];
    expect(
      averageBySubject(
        [
          log("a", 2, []),
          log("b", 2, ["x"]),
          log("c", 4, ["x", "y", "z"]),
          // 隠した用語
          log("z", 1, ["x"]),
        ],
        terms,
      ),
    ).toEqual([
      { subject: "英語", count: 1, percent: 25 },
      { subject: "数学", count: 2, percent: 75 },
    ]);
  });

  it("記録がなければ空", () => {
    expect(averageBySubject([], [term("a")])).toEqual([]);
  });
});
