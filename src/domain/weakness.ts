import type { AiQuestNote } from "./ai-quest";
import { accuracy, totalStudySeconds, type SubjectStats } from "./subject-stats";

/** 苦手かどうかを判定するのに必要な解答数。 */
export const MIN_ANSWERS = 3;
/** 正答率がこれを下回ると苦手とみなす。 */
export const WEAK_ACCURACY = 0.7;
/** 苦手科目のクエストで解く問題数。 */
export const QUEST_ANSWERS = 5;
/** 学習不足の科目のクエストで学ぶ時間（15分）。 */
export const QUEST_STUDY_SECONDS = 15 * 60;

/**
 * 今日のクエスト。
 * weak：苦手／neglected：学習不足／starter：材料が足りない／clear：苦手なし
 */
export type Quest =
  | { readonly kind: "weak" | "neglected"; readonly subject: string }
  | { readonly kind: "starter" | "clear" };

export type QuestProgress = {
  readonly current: number;
  readonly goal: number;
  readonly isAchieved: boolean;
};

/** その日に選んだクエスト。日付は日本時間の「2026-11-24」。 */
export type SavedQuest = {
  readonly date: string;
  readonly kind: "weak" | "neglected";
  readonly subject: string;
  /** AIの提案を採用したときの説明。 */
  readonly ai?: AiQuestNote;
};

export function isWeak(stats: SubjectStats): boolean {
  const rate = accuracy(stats);
  return (
    stats.answerCount >= MIN_ANSWERS && rate !== null && rate < WEAK_ACCURACY
  );
}

/** 学習時間が、科目数で均等に割った時間の半分に満たないか。 */
export function isNeglected(
  stats: SubjectStats,
  all: readonly SubjectStats[],
): boolean {
  const total = totalStudySeconds(all);
  if (all.length < 2 || total <= 0) return false;
  return stats.studySeconds < total / all.length / 2;
}

/** 集計から、今いちばん取り組むべきクエストを選ぶ。 */
export function selectQuest(all: readonly SubjectStats[]): Quest {
  const weakest = all.filter(isWeak).sort(compareWeak)[0];
  if (weakest !== undefined) return { kind: "weak", subject: weakest.subject };

  const neglected = all
    .filter((stats) => isNeglected(stats, all))
    .sort(compareNeglected)[0];
  if (neglected !== undefined) {
    return { kind: "neglected", subject: neglected.subject };
  }

  const hasEnough = all.some((stats) => stats.answerCount >= MIN_ANSWERS);
  return { kind: hasEnough ? "clear" : "starter" };
}

/**
 * 今日すでに選んだクエストがあれば、それを使い続ける。
 * 解くうちに正答率が変わっても、途中で別の科目へ移らないようにするため。
 */
export function resolveQuest(
  saved: SavedQuest | null,
  today: string,
  all: readonly SubjectStats[],
): Quest {
  if (
    saved !== null &&
    saved.date === today &&
    all.some((stats) => stats.subject === saved.subject)
  ) {
    return { kind: saved.kind, subject: saved.subject };
  }
  return selectQuest(all);
}

/** 今日どこまで進んだか。clear には目標がないため null。 */
export function questProgress(
  quest: Quest,
  all: readonly SubjectStats[],
): QuestProgress | null {
  switch (quest.kind) {
    case "weak":
      return progress(
        find(all, quest.subject)?.todayAnswerCount ?? 0,
        QUEST_ANSWERS,
      );
    case "neglected":
      return progress(
        find(all, quest.subject)?.todayStudySeconds ?? 0,
        QUEST_STUDY_SECONDS,
      );
    case "starter":
      // どれか1科目が、判定に必要な解答数に届けばよい。
      return progress(
        Math.max(0, ...all.map((stats) => stats.answerCount)),
        MIN_ANSWERS,
      );
    case "clear":
      return null;
  }
}

function progress(value: number, goal: number): QuestProgress {
  return { current: Math.min(value, goal), goal, isAchieved: value >= goal };
}

function find(
  all: readonly SubjectStats[],
  subject: string,
): SubjectStats | undefined {
  return all.find((stats) => stats.subject === subject);
}

/** 正答率の低い順。同じなら解答数の多い順、学習時間の短い順、科目名の順。 */
function compareWeak(a: SubjectStats, b: SubjectStats): number {
  return (
    (accuracy(a) ?? 1) - (accuracy(b) ?? 1) ||
    b.answerCount - a.answerCount ||
    a.studySeconds - b.studySeconds ||
    compareName(a, b)
  );
}

function compareNeglected(a: SubjectStats, b: SubjectStats): number {
  return a.studySeconds - b.studySeconds || compareName(a, b);
}

function compareName(a: SubjectStats, b: SubjectStats): number {
  if (a.subject === b.subject) return 0;
  return a.subject < b.subject ? -1 : 1;
}

/** 苦手な科目を先に、残りは正答率の低い順に並べる。未解答は最後。 */
export function sortByWeakness(all: readonly SubjectStats[]): SubjectStats[] {
  return [...all].sort(
    (a, b) =>
      Number(isWeak(b)) - Number(isWeak(a)) ||
      (accuracy(a) ?? 2) - (accuracy(b) ?? 2) ||
      compareName(a, b),
  );
}
