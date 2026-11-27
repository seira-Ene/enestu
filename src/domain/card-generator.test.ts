import { describe, expect, it } from "vitest";
import { MAX_IMPORT_CARDS } from "./card-import";
import { generateCards, MAX_GENERATE_LENGTH } from "./card-generator";

const pick = (text: string) =>
  generateCards(text, []).candidates.map(({ question, answer, rule }) => ({
    question,
    answer,
    rule,
  }));

describe("generateCards：文章の形", () => {
  it("「〜を〇〇という」から、〇〇を答える問題を作る", () => {
    expect(
      pick(
        "光のエネルギーを使って、二酸化炭素と水から養分をつくるはたらきを光合成という。",
      ),
    ).toEqual([
      {
        question: "光のエネルギーを使って、二酸化炭素と水から養分をつくるはたらきを何という？",
        answer: "光合成",
        rule: "naming",
      },
    ]);
    expect(pick("体の外から入った異物を攻撃するしくみを「免疫」と呼ぶ。")).toMatchObject([
      { answer: "免疫", rule: "naming" },
    ]);
  });

  it("1行に何文あっても、文ごとに読む", () => {
    expect(
      pick(
        "光合成は葉緑体で行われる。気孔とは、葉の表面にある小さなすきまのことである。根から吸った水が葉から出ることを蒸散という。",
      ),
    ).toEqual([
      { question: "葉の表面にある小さなすきまを何という？", answer: "気孔", rule: "definition" },
      { question: "根から吸った水が葉から出ることを何という？", answer: "蒸散", rule: "naming" },
    ]);
  });

  it("用語集の「A：B」「A＝B」「A ― B」を読む", () => {
    expect(
      pick(
        [
          "- 蒸散：植物の体から水が水蒸気となって出ていくこと",
          "1. 固有値 = 行列で向きが変わらないベクトルの拡大率",
          "道管 ― 根から吸った水を運ぶ管",
        ].join("\n"),
      ),
    ).toEqual([
      { question: "植物の体から水が水蒸気となって出ていくことを何という？", answer: "蒸散", rule: "glossary" },
      { question: "行列で向きが変わらないベクトルの拡大率を何という？", answer: "固有値", rule: "glossary" },
      { question: "根から吸った水を運ぶ管を何という？", answer: "道管", rule: "glossary" },
    ]);
  });

  it("強調した語は、穴埋めの問題にする", () => {
    expect(pick("植物は根から**水**を吸い上げ、【道管】を通して運ぶ。")).toEqual([
      { question: "植物は根から（　）を吸い上げ、道管を通して運ぶ。", answer: "水", rule: "cloze" },
      { question: "植物は根から水を吸い上げ、（　）を通して運ぶ。", answer: "道管", rule: "cloze" },
    ]);
  });

  it("問題にならない文は読まない", () => {
    expect(
      pick(
        [
          "今日は晴れです。",
          "これを酸素という。",
          "Q: 首都は？",
          "A: 東京",
          "# 第3章 植物のはたらき",
          "時刻：10時",
        ].join("\n"),
      ),
    ).toEqual([]);
  });
});

describe("generateCards：上限と重なり", () => {
  it("答えが長すぎる候補は作らない", () => {
    expect(pick(`この長い説明の部分を${"あ".repeat(41)}という。`)).toEqual([]);
  });

  it("重なる候補と、登録済みのカードを除く", () => {
    const text = "気孔とは、葉のすきまである。\n気孔とは、葉のすきまである。\n道管とは、水を運ぶ管である。";
    const result = generateCards(text, [{ question: "水を運ぶ管を何という？", answer: "道管" }]);
    expect(result.candidates.map(({ answer }) => answer)).toEqual(["気孔"]);
    expect(result.duplicateCount).toBe(2);
  });

  it(`1回に${MAX_IMPORT_CARDS}枚まで。残りの数を伝える`, () => {
    const text = Array.from(
      { length: MAX_IMPORT_CARDS + 3 },
      (_, index) => `用語${index}とは、説明の番号${index}である。`,
    ).join("\n");
    const result = generateCards(text, []);
    expect(result.candidates).toHaveLength(MAX_IMPORT_CARDS);
    expect(result.overflowCount).toBe(3);
  });

  it(`${MAX_GENERATE_LENGTH}文字より後ろは読まない`, () => {
    const text = `${"。".repeat(MAX_GENERATE_LENGTH)}気孔とは、葉のすきまである。`;
    expect(generateCards(text, []).candidates).toEqual([]);
  });

  it("候補には、強調の記号を外した元の文を添える", () => {
    const [first] = generateCards("植物は**水**を吸う。", []).candidates;
    expect(first).toMatchObject({ source: "植物は水を吸う。", subject: null });
  });
});
