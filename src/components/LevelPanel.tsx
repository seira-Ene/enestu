import Link from "next/link";
import {
  levelState,
  nextRankLevel,
  unlockedRankCount,
  XP_PER_CORRECT,
  XP_PER_MINUTE,
  type ProgressTotals,
} from "@/domain/progress";
import type { Remote } from "@/lib/use-remote";
import type { WorldTheme } from "@/themes/types";
import { HEADING, PANEL } from "./form-styles";
import { useSettings } from "./SettingsProvider";

type Props = {
  theme: WorldTheme;
  remote: Remote<ProgressTotals>;
};

/** レベル・称号・解放されたセリフ。 */
export function LevelPanel({ theme, remote }: Props) {
  const { data, error, reload } = remote;
  const { label } = theme.progress;

  return (
    <section aria-label={label} className={PANEL}>
      <h2 className={HEADING}>{label}</h2>
      <HeroName />
      {error !== null && (
        <div role="alert" className="flex flex-col items-start gap-2">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void reload()}
            className="underline"
          >
            もう一度読み込む
          </button>
        </div>
      )}
      {data === null && error === null && <p>読み込んでいます…</p>}
      {data !== null && <LevelBody theme={theme} totals={data} />}
    </section>
  );
}

/** 主人公の名前。まだ決めていなければ、決める画面へ進める。 */
function HeroName() {
  const { data } = useSettings();
  if (data === null) return null;
  return data.heroName === null ? (
    <Link href="/account#hero" className="text-sm text-accent underline">
      主人公の名前を決める
    </Link>
  ) : (
    <p className="font-display text-lg break-words">{data.heroName}</p>
  );
}

function LevelBody({
  theme,
  totals,
}: {
  theme: WorldTheme;
  totals: ProgressTotals;
}) {
  const { ranks, stories } = theme.progress;
  const { level, current, needed } = levelState(totals);
  const rankCount = unlockedRankCount(level);
  const nextRank = nextRankLevel(level);

  return (
    <>
      <p className="flex items-baseline justify-between gap-2">
        <span className="font-display min-w-0 text-xl">
          {ranks[rankCount - 1]}
        </span>
        <span className="font-display shrink-0 text-xl text-primary tabular-nums">
          Lv.{level}
        </span>
      </p>
      <div className="flex flex-col gap-1">
        <div
          role="meter"
          aria-label="次のレベルまで"
          aria-valuemin={0}
          aria-valuemax={needed === 0 ? 1 : needed}
          aria-valuenow={needed === 0 ? 1 : current}
          className="h-3 overflow-hidden rounded-full border border-accent bg-background"
        >
          <div
            className="h-full bg-accent motion-safe:transition-[width] motion-safe:duration-700"
            style={{
              width: `${needed === 0 ? 100 : (current / needed) * 100}%`,
            }}
          />
        </div>
        <p className="flex flex-wrap justify-between gap-x-2 text-xs">
          <span>
            学習1分＝{XP_PER_MINUTE}、正解1問＝{XP_PER_CORRECT}
          </span>
          <span className="tabular-nums">
            {needed === 0 ? "最大レベル" : `次まで ${needed - current}`}
          </span>
        </p>
      </div>
      <details>
        <summary className="cursor-pointer text-sm">
          {theme.character.name}との思い出（{rankCount} / {stories.length}）
        </summary>
        <ol className="mt-2 flex flex-col gap-2">
          {stories.slice(0, rankCount).map((story) => (
            <li key={story} className="font-display leading-relaxed">
              「{story}」
            </li>
          ))}
        </ol>
        {nextRank !== null && (
          <p className="mt-2 text-sm opacity-80">
            続きは Lv.{nextRank} で解放されます。
          </p>
        )}
      </details>
    </>
  );
}
