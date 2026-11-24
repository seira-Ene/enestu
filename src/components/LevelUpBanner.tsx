import {
  levelState,
  unlockedRankCount,
  type ProgressTotals,
} from "@/domain/progress";
import type { ThemeProgress } from "@/themes/types";

type Props = {
  theme: ThemeProgress;
  /** まだ取得できていなければ null。 */
  totals: ProgressTotals | null;
  /** 学習やテストを始める前のレベル。分からなければ null。 */
  previousLevel: number | null;
};

/** レベルが上がったときだけ出す知らせ。 */
export function LevelUpBanner({ theme, totals, previousLevel }: Props) {
  if (totals === null || previousLevel === null) return null;
  const { level } = levelState(totals);
  if (level <= previousLevel) return null;
  const hasNewRank = unlockedRankCount(level) > unlockedRankCount(previousLevel);

  return (
    <p
      role="status"
      className="button-primary font-display px-3 py-3 text-center text-lg motion-safe:animate-hit"
    >
      {theme.levelUp}（Lv.{level}）
      {hasNewRank && (
        <span className="block text-sm">新しい称号とセリフ！</span>
      )}
    </p>
  );
}
