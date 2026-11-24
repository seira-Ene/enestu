import { describe, expect, it } from "vitest";
import {
  correctPercent,
  listSubjects,
  MAX_QUIZ_QUESTIONS,
  rankQuiz,
  scoreQuiz,
  selectQuizCards,
  type QuizCard,
} from "./quiz";

function cards(count: number, subject = "数学"): QuizCard[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${subject}-${i}`,
    subject,
    question: `問${i}`,
    answer: `答${i}`,
  }));
}

/** 決まった値を順に返す、テスト用の乱数。 */
function sequence(values: readonly number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length] ?? 0;
}

describe("selectQuizCards", () => {
  it("カードがなければ空", () => {
    expect(selectQuizCards([], null, () => 0)).toEqual([]);
  });

  it("重複も欠けもなく並べ替える", () => {
    const pool = cards(8);
    const picked = selectQuizCards(pool, null, sequence([0.1, 0.9, 0.5]));
    expect(picked).toHaveLength(8);
    expect(new Set(picked)).toEqual(new Set(pool));
  });

  it("元の配列を変えない", () => {
    const pool = cards(5);
    const copy = [...pool];
    selectQuizCards(pool, null, () => 0);
    expect(pool).toEqual(copy);
  });

  it("乱数によって順番が変わる", () => {
    const pool = cards(4);
    const ids = (random: () => number) =>
      selectQuizCards(pool, null, random).map((card) => card.id);
    const original = pool.map((card) => card.id);
    expect(ids(() => 0)).toEqual(original);
    expect(ids(() => 0.999)).toEqual([...original].reverse());
  });

  it("どの位置にも、各カードが偏りなく現れる", () => {
    const pool = cards(3);
    const counts = new Map<string, number>();
    // 1枚目は3通り、2枚目は2通り。引き方を総当たりする。
    for (const a of [0, 1 / 3, 2 / 3]) {
      for (const b of [0, 1 / 2]) {
        const key = selectQuizCards(pool, null, sequence([a, b, 0]))
          .map((card) => card.id)
          .join();
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    expect([...counts.values()]).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it("科目で絞り込む", () => {
    const pool = [...cards(2, "数学"), ...cards(3, "英語")];
    expect(selectQuizCards(pool, "英語", () => 0)).toHaveLength(3);
    expect(selectQuizCards(pool, "理科", () => 0)).toEqual([]);
    expect(selectQuizCards(pool, null, () => 0)).toHaveLength(5);
  });

  it("最大10問まで出す", () => {
    expect(selectQuizCards(cards(10), null, () => 0)).toHaveLength(10);
    expect(selectQuizCards(cards(11), null, () => 0)).toHaveLength(
      MAX_QUIZ_QUESTIONS,
    );
  });
});

describe("listSubjects", () => {
  it("重複を除き、最初に現れた順に並べる", () => {
    const items = [{ subject: "英語" }, { subject: "数学" }, { subject: "英語" }];
    expect(listSubjects(items)).toEqual(["英語", "数学"]);
    expect(listSubjects([])).toEqual([]);
  });
});

describe("scoreQuiz", () => {
  it("正解数と解答数を数える", () => {
    expect(scoreQuiz([])).toEqual({ correct: 0, total: 0 });
    expect(scoreQuiz([true, false, true])).toEqual({ correct: 2, total: 3 });
  });
});

describe("rankQuiz", () => {
  it.each([
    [0, 0, "retry"],
    [0, 5, "retry"],
    [2, 5, "retry"],
    [3, 5, "good"],
    [4, 5, "good"],
    [5, 5, "perfect"],
    [1, 1, "perfect"],
  ])("%d / %d → %s", (correct, total, expected) => {
    expect(rankQuiz({ correct, total })).toBe(expected);
  });
});

describe("correctPercent", () => {
  it.each([
    [0, 0, 0],
    [0, 3, 0],
    [1, 3, 33],
    [2, 3, 66],
    [3, 3, 100],
  ])("%d / %d → %d%%", (correct, total, expected) => {
    expect(correctPercent({ correct, total })).toBe(expected);
  });
});
