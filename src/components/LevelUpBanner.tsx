import {
  levelState,
  unlockedRankCount,
  type ProgressTotals,
} from "@/domain/progress";
import type { WorldTheme } from "@/themes/types";
import { CharacterArt } from "./CharacterArt";

type Props = {
  theme: WorldTheme;
  /** まだ取得できていなければ null。 */
  totals: ProgressTotals | null;
  /** 学習やテストを始める前のレベル。分からなければ null。 */
  previousLevel: number | null;
  /** お祝いの絵も出すか。 */
  hasArt: boolean;
};

/** レベルが上がったときだけ出す知らせ。 */
export function LevelUpBanner({
  theme,
  totals,
  previousLevel,
  hasArt,
}: Props) {
  if (totals === null || previousLevel === null) return null;
  const { level } = levelState(totals);
  if (level <= previousLevel) return null;
  const hasNewRank = unlockedRankCount(level) > unlockedRankCount(previousLevel);

  return (
    <div
      role="status"
      className="button-primary font-display overflow-hidden text-center text-lg motion-safe:animate-hit"
    >
      {hasArt && <CharacterArt theme={theme} kind="banner" />}
      <p className="px-3 py-3">
        {theme.progress.levelUp}（Lv.{level}）
        {hasNewRank && (
          <span className="block text-sm">新しい称号とセリフ！</span>
        )}
      </p>
    </div>
  );
}
