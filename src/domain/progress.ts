/** 学習1分あたりの経験値。 */
export const XP_PER_MINUTE = 2;
/** 正解1問あたりの経験値。 */
export const XP_PER_CORRECT = 5;
export const MAX_LEVEL = 99;

/** 称号とセリフが増えるレベル。テーマの ranks と stories に対応する。 */
export const RANK_LEVELS = [1, 3, 6, 10, 15] as const;

/** これ以上続いたら、連続正解の演出を出す。 */
export const MIN_COMBO = 2;

const XP_STEP = 25;

/** これまでの合計。 */
export type ProgressTotals = {
  readonly studySeconds: number;
  readonly correctCount: number;
};

export type LevelState = {
  readonly level: number;
  /** 今のレベルになってから得た経験値。 */
  readonly current: number;
  /** 次のレベルまでに要る経験値。最大レベルなら0。 */
  readonly needed: number;
};

export function totalXp({ studySeconds, correctCount }: ProgressTotals): number {
  const minutes = Math.floor(Math.max(0, studySeconds) / 60);
  return minutes * XP_PER_MINUTE + Math.max(0, correctCount) * XP_PER_CORRECT;
}

/** そのレベルになるために要る、経験値の合計（1 → 0、2 → 50、3 → 150）。 */
export function xpForLevel(level: number): number {
  return XP_STEP * level * (level - 1);
}

export function levelState(totals: ProgressTotals): LevelState {
  const xp = totalXp(totals);
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level++;
  if (level === MAX_LEVEL) return { level, current: 0, needed: 0 };
  const base = xpForLevel(level);
  return { level, current: xp - base, needed: xpForLevel(level + 1) - base };
}

/** そのレベルで得ている称号の数（1以上）。 */
export function unlockedRankCount(level: number): number {
  return Math.max(1, RANK_LEVELS.filter((at) => level >= at).length);
}

/** 次の称号が得られるレベル。すべて得ていれば null。 */
export function nextRankLevel(level: number): number | null {
  return RANK_LEVELS.find((at) => at > level) ?? null;
}

/** 最後から続いている正解の数。 */
export function comboCount(results: readonly boolean[]): number {
  const lastMiss = results.lastIndexOf(false);
  return results.length - 1 - lastMiss;
}
