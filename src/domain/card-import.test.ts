import { describe, expect, it } from "vitest";
import {
  buildAiPrompt,
  MAX_IMPORT_CARDS,
  parseImportedCards,
} from "./card-import";

/** [科目, 問題, 答え] の一覧にして比べる。 */
function read(text: string): (string | null)[][] {
  return parseImportedCards(text, []).candidates.map((c) => [
    c.subject,
    c.question,
    c.answer,
  ]);
}

describe("Q: / A: の形", () => {
  it("続けて並んだ組を読み取る", () => {
    expect(read("Q: 首都は？\nA: 東京\n\nQ: 1+1は？\nA: 2")).toEqual([
      [null, "首都は？", "東京"],
      [null, "1+1は？", "2"],
    ]);
  });

  it.each([
    "q：首都は？\na：東京",
    "Q1. 首都は？\nA1. 東京",
    "問題：首都は？\n答え：東京",
    "問1：首都は？\n解答1：東京",
    "**Q: 首都は？**\n**A: 東京**",
    "- Q: 首都は？\n- A: 東京",
    "1. Q: 首都は？\r\n   A: 東京\r\n",
    "## Q: 首都は？\nA: 東京",
  ])("%j も読み取る", (text) => {
    expect(read(text)).toEqual([[null, "首都は？", "東京"]]);
  });

  it("問題文が複数行でも読み取る", () => {
    expect(read("Q: 次の式の\n値は？\nA: 3")).toEqual([
      [null, "次の式の\n値は？", "3"],
    ]);
  });

  it("答えのない問題や、空の答えは捨てる", () => {
    expect(read("Q: 一つ目\nQ: 二つ目\nA: 答え\nQ: 三つ目\nA: ")).toEqual([
      [null, "二つ目", "答え"],
    ]);
  });
});

describe("区切り文字の形", () => {
  it("カンマ、タブ、表を読み取る", () => {
    expect(read("首都は？,東京")).toEqual([[null, "首都は？", "東京"]]);
    expect(read("首都は？\t東京")).toEqual([[null, "首都は？", "東京"]]);
    expect(
      read("| 問題 | 答え |\n| --- | :---: |\n| 首都は？ | 東京 |"),
    ).toEqual([[null, "首都は？", "東京"]]);
  });

  it("3つの欄なら、科目・問題・答えとして読む", () => {
    expect(read("地理,首都は？,東京")).toEqual([["地理", "首都は？", "東京"]]);
    expect(read(",首都は？,東京")).toEqual([[null, "首都は？", "東京"]]);
  });

  it("見出しの行を飛ばす", () => {
    expect(read("問題,答え\n首都は？,東京")).toEqual([
      [null, "首都は？", "東京"],
    ]);
    expect(read("Subject,Question,Answer")).toEqual([]);
  });

  it("引用符の中のカンマと引用符を扱う", () => {
    expect(read('"a,b は？","x ""y"" z"')).toEqual([
      [null, "a,b は？", 'x "y" z'],
    ]);
  });

  it("行頭の負の数や小数を、箇条書きの記号と間違えない", () => {
    expect(read("-1+1は？,0")).toEqual([[null, "-1+1は？", "0"]]);
    expect(read("1.5の2倍は？,3")).toEqual([[null, "1.5の2倍は？", "3"]]);
  });

  it("欄が1つか4つ以上の行は読まない", () => {
    expect(read("ただの文章です。\na,b,c,d")).toEqual([]);
  });
});

describe("「AとはB」の形", () => {
  it.each([
    "固有値とは、行列の拡大率である。",
    "固有値とは行列の拡大率のことである。",
    "固有値とは、行列の拡大率です",
    "・固有値とは行列の拡大率のこと。",
    "固有値とは行列の拡大率を指す。",
  ])("%j から、用語を答える問題を作る", (text) => {
    expect(read(text)).toEqual([
      [null, "行列の拡大率を何という？", "固有値"],
    ]);
  });

  it("意味が空なら捨てる", () => {
    expect(read("固有値とは。")).toEqual([]);
  });
});

describe("まとめ方", () => {
  it("何も読み取れなければ空", () => {
    for (const text of ["", "\n\n", "ただの文章。"]) {
      expect(parseImportedCards(text, [])).toEqual({
        candidates: [],
        duplicateCount: 0,
        overflowCount: 0,
      });
    }
  });

  it("形が混ざっていても、現れた順に読み取る", () => {
    expect(read("固有値とは拡大率である。\nQ: 首都は？\nA: 東京\n1+1,2")).toEqual(
      [
        [null, "拡大率を何という？", "固有値"],
        [null, "首都は？", "東京"],
        [null, "1+1", "2"],
      ],
    );
  });

  it("登録済みのカードや、候補どうしの重複を除く", () => {
    const result = parseImportedCards(
      "首都は？,東京\n 首都は？ , 東京\n県庁所在地は？,横浜",
      [{ question: "県庁所在地は ？", answer: "横浜" }],
    );
    expect(result.candidates).toHaveLength(1);
    expect(result.duplicateCount).toBe(2);
  });

  it("問題が同じでも、答えが違えば残す", () => {
    expect(read("例は？,A\n例は？,B")).toHaveLength(2);
  });

  it("上限までにし、超えた数を知らせる", () => {
    const text = Array.from(
      { length: MAX_IMPORT_CARDS + 3 },
      (_, i) => `問${i}番,答${i}`,
    ).join("\n");
    const result = parseImportedCards(text, []);
    expect(result.candidates).toHaveLength(MAX_IMPORT_CARDS);
    expect(result.overflowCount).toBe(3);
  });

  it("長い文章でも、すぐに終わる", () => {
    const start = performance.now();
    parseImportedCards("とは".repeat(50_000), []);
    parseImportedCards(`${"#".repeat(50_000)}\n${"|".repeat(50_000)}`, []);
    parseImportedCards(" ".repeat(100_000), []);
    parseImportedCards(`とは${".".repeat(99_000)}x`, []);
    parseImportedCards(`あとは${"。".repeat(990)}x\n`.repeat(100), []);
    expect(performance.now() - start).toBeLessThan(1000);
  });
});

describe("buildAiPrompt", () => {
  it("取り込める形を指定し、科目があれば含める", () => {
    expect(buildAiPrompt("線形代数")).toContain("線形代数");
    expect(buildAiPrompt(" ")).not.toContain("科目は");
    const prompt = buildAiPrompt("");
    expect(prompt).toContain("Q: 問題文\nA: 答え");
  });

  it("指示どおりの返事を、そのまま取り込める", () => {
    const reply = "Q: 行列の拡大率は？\nA: 固有値\n\nQ: 向きが変わらないのは？\nA: 固有ベクトル";
    expect(parseImportedCards(reply, []).candidates).toHaveLength(2);
  });
});
