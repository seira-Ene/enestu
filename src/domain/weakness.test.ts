import { describe, expect, it } from "vitest";
import type { SubjectStats } from "./subject-stats";
import {
  isNeglected,
  isWeak,
  questProgress,
  resolveQuest,
  selectQuest,
  sortByWeakness,
} from "./weakness";

function stats(
  subject: string,
  overrides: Partial<SubjectStats> = {},
): SubjectStats {
  return {
    subject,
    studySeconds: 0,
    answerCount: 0,
    correctCount: 0,
    reasons: { knowledge: 0, understanding: 0, careless: 0 },
    todayStudySeconds: 0,
    todayAnswerCount: 0,
    ...overrides,
  };
}

const answered = (subject: string, correctCount: number, answerCount: number) =>
  stats(subject, { correctCount, answerCount });

describe("isWeak", () => {
  it.each([
    [0, 0, false],
    [0, 2, false], // 解答数が足りない
    [0, 3, true],
    [2, 3, true], // 66%
    [69, 100, true],
    [7, 10, false], // ちょうど70%
    [10, 10, false],
  ])("%d / %d → %s", (correct, total, expected) => {
    expect(isWeak(answered("数学", correct, total))).toBe(expected);
  });
});

describe("isNeglected", () => {
  const pair = (a: number, b: number) => [
    stats("数学", { studySeconds: a }),
    stats("英語", { studySeconds: b }),
  ];

  it("均等な時間の半分に満たなければ学習不足", () => {
    // 合計1200秒、2科目の均等は600秒、半分は300秒
    const [math, english] = pair(299, 901);
    if (math === undefined || english === undefined) throw new Error();
    expect(isNeglected(math, [math, english])).toBe(true);
    expect(isNeglected(english, [math, english])).toBe(false);
  });

  it("ちょうど半分なら学習不足ではない", () => {
    const [math, english] = pair(300, 900);
    if (math === undefined || english === undefined) throw new Error();
    expect(isNeglected(math, [math, english])).toBe(false);
  });

  it("1科目だけ、または学習時間が全くなければ判定しない", () => {
    const only = stats("数学");
    expect(isNeglected(only, [only])).toBe(false);
    expect(isNeglected(only, [only, stats("英語")])).toBe(false);
  });
});

describe("selectQuest", () => {
  it("データがなければ starter", () => {
    expect(selectQuest([])).toEqual({ kind: "starter" });
    expect(selectQuest([answered("数学", 0, 2)])).toEqual({ kind: "starter" });
  });

  it("苦手も学習不足もなければ clear", () => {
    expect(selectQuest([answered("数学", 3, 3)])).toEqual({ kind: "clear" });
  });

  it("正答率が最も低い苦手を選ぶ", () => {
    const all = [
      answered("数学", 2, 4),
      answered("英語", 1, 4),
      answered("理科", 0, 2),
    ];
    expect(selectQuest(all)).toEqual({ kind: "weak", subject: "英語" });
  });

  it("正答率が同じなら、解答数の多い方、学習時間の短い方を選ぶ", () => {
    expect(
      selectQuest([answered("数学", 2, 4), answered("英語", 5, 10)]),
    ).toEqual({ kind: "weak", subject: "英語" });
    expect(
      selectQuest([
        { ...answered("数学", 2, 4), studySeconds: 100 },
        { ...answered("英語", 2, 4), studySeconds: 99 },
      ]),
    ).toEqual({ kind: "weak", subject: "英語" });
  });

  it("学習不足より苦手を優先する", () => {
    const all = [
      { ...answered("数学", 0, 5), studySeconds: 9000 },
      stats("英語"),
    ];
    expect(selectQuest(all)).toEqual({ kind: "weak", subject: "数学" });
  });

  it("苦手がなければ、学習時間の最も短い科目を選ぶ", () => {
    const all = [
      stats("数学", { studySeconds: 9000 }),
      stats("英語", { studySeconds: 100 }),
      stats("理科", { studySeconds: 50 }),
    ];
    expect(selectQuest(all)).toEqual({ kind: "neglected", subject: "理科" });
  });

  it("元の配列の順番によらず、同じ科目を選ぶ", () => {
    const all = [answered("い", 1, 4), answered("あ", 1, 4)];
    expect(selectQuest(all)).toEqual(selectQuest([...all].reverse()));
  });
});

describe("resolveQuest", () => {
  const saved = { date: "2026-11-24", kind: "weak", subject: "数学" } as const;

  it("今日選んだクエストは、苦手でなくなっても変えない", () => {
    const all = [answered("数学", 10, 10), answered("英語", 0, 5)];
    expect(resolveQuest(saved, "2026-11-24", all)).toEqual({
      kind: "weak",
      subject: "数学",
    });
  });

  it("日付が変わったら選び直す", () => {
    const all = [answered("数学", 10, 10), answered("英語", 0, 5)];
    expect(resolveQuest(saved, "2026-11-25", all)).toEqual({
      kind: "weak",
      subject: "英語",
    });
  });

  it("保存がない、または科目がなくなっていれば選び直す", () => {
    const all = [answered("英語", 0, 5)];
    const expected = { kind: "weak", subject: "英語" };
    expect(resolveQuest(null, "2026-11-24", all)).toEqual(expected);
    expect(resolveQuest(saved, "2026-11-24", all)).toEqual(expected);
  });
});

describe("questProgress", () => {
  it("苦手は、今日その科目を解いた数で測る", () => {
    const at = (todayAnswerCount: number) =>
      questProgress({ kind: "weak", subject: "数学" }, [
        stats("数学", { todayAnswerCount }),
        stats("英語", { todayAnswerCount: 99 }),
      ]);
    expect(at(0)).toEqual({ current: 0, goal: 5, isAchieved: false });
    expect(at(4)).toEqual({ current: 4, goal: 5, isAchieved: false });
    expect(at(5)).toEqual({ current: 5, goal: 5, isAchieved: true });
    expect(at(9)).toEqual({ current: 5, goal: 5, isAchieved: true });
  });

  it("学習不足は、今日その科目を学んだ時間で測る", () => {
    const at = (todayStudySeconds: number) =>
      questProgress({ kind: "neglected", subject: "数学" }, [
        stats("数学", { todayStudySeconds }),
      ])?.isAchieved;
    expect(at(899)).toBe(false);
    expect(at(900)).toBe(true);
  });

  it("starter は、いちばん解いた科目の解答数で測る", () => {
    expect(questProgress({ kind: "starter" }, [])).toEqual({
      current: 0,
      goal: 3,
      isAchieved: false,
    });
    expect(
      questProgress({ kind: "starter" }, [
        answered("数学", 0, 2),
        answered("英語", 1, 1),
      ])?.current,
    ).toBe(2);
  });

  it("clear に目標はなく、科目がなければ0から", () => {
    expect(questProgress({ kind: "clear" }, [])).toBeNull();
    expect(
      questProgress({ kind: "weak", subject: "ない" }, [])?.current,
    ).toBe(0);
  });
});

describe("sortByWeakness", () => {
  it("苦手、正答率の低い順、未解答の順に並べる", () => {
    const all = [
      stats("未解答"),
      answered("得意", 9, 10),
      answered("少数", 0, 1),
      answered("苦手", 5, 10),
    ];
    expect(sortByWeakness(all).map((item) => item.subject)).toEqual([
      "苦手",
      "少数",
      "得意",
      "未解答",
    ]);
  });
});
