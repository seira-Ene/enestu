import { MISTAKE_REASONS, type MistakeReason } from "./quiz";
import { jstDayRange } from "./study-time";

/** 集計する日数（今日を含む）。 */
export const STATS_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/** 科目ごとに数えた、学習時間と解答。 */
export type SubjectCounts = {
  readonly subject: string;
  readonly studySeconds: number;
  readonly answerCount: number;
  readonly correctCount: number;
  readonly reasons: Readonly<Record<MistakeReason, number>>;
};

/** 直近の集計に、今日の分を添えたもの。 */
export type SubjectStats = SubjectCounts & {
  readonly todayStudySeconds: number;
  readonly todayAnswerCount: number;
};

/** 集計を始める時刻（日本時間の0時）。 */
export function statsSince(now: Date): Date {
  return new Date(
    jstDayRange(now).start.getTime() - (STATS_DAYS - 1) * DAY_MS,
  );
}

/** 直近の集計へ、今日の集計を科目名で結び付ける。 */
export function attachToday(
  recent: readonly SubjectCounts[],
  today: readonly SubjectCounts[],
): SubjectStats[] {
  const todayBySubject = new Map(today.map((item) => [item.subject, item]));
  return recent.map((item) => {
    const match = todayBySubject.get(item.subject);
    return {
      ...item,
      todayStudySeconds: match?.studySeconds ?? 0,
      todayAnswerCount: match?.answerCount ?? 0,
    };
  });
}

/** 正答率（0〜1）。まだ解いていなければ null。 */
export function accuracy(stats: SubjectCounts): number | null {
  return stats.answerCount > 0 ? stats.correctCount / stats.answerCount : null;
}

/** 全科目の学習時間に占める割合（0〜1）。全体が0秒なら null。 */
export function studyShare(
  stats: SubjectCounts,
  all: readonly SubjectCounts[],
): number | null {
  const total = totalStudySeconds(all);
  return total > 0 ? stats.studySeconds / total : null;
}

export function totalStudySeconds(all: readonly SubjectCounts[]): number {
  return all.reduce((total, item) => total + item.studySeconds, 0);
}

/** 原因を選ばなかった誤答の数。 */
export function unclassifiedCount(stats: SubjectCounts): number {
  const classified = MISTAKE_REASONS.reduce(
    (total, reason) => total + stats.reasons[reason],
    0,
  );
  return Math.max(0, stats.answerCount - stats.correctCount - classified);
}

/** 最も多い誤答原因。同数なら MISTAKE_REASONS の順で先のもの。 */
export function topMistakeReason(stats: SubjectCounts): MistakeReason | null {
  let top: MistakeReason | null = null;
  for (const reason of MISTAKE_REASONS) {
    const count = stats.reasons[reason];
    if (count > 0 && (top === null || count > stats.reasons[top])) top = reason;
  }
  return top;
}

/** 割合（0〜1）を整数の百分率にする。1未満は100に切り上げない。 */
export function toPercent(ratio: number): number {
  return Math.min(100, Math.max(0, Math.floor(ratio * 100)));
}
