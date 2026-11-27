import { useState } from "react";
import {
  fillDays,
  greetingFor,
  loginReward,
  type DailyClaim,
  type DailyStatus,
} from "@/domain/daily";
import { parseItemId } from "@/domain/gacha";
import { claimDaily, fetchDailyStatus } from "@/lib/daily-api";
import { useRemote } from "@/lib/use-remote";
import { themes } from "@/themes";
import type { WorldTheme } from "@/themes/types";
import { CharacterArt } from "./CharacterArt";
import { ALERT, HEADING, PANEL, PRIMARY_BUTTON, SECONDARY_BUTTON } from "./form-styles";

/**
 * その日初めてホームを開いたときのあいさつと、ログインボーナス。
 * 何日も空いたらさびしがり、受け取ると笑顔に戻る。節目の連続日数では喜ぶ。
 */
export function DailyGreeting({ theme }: { theme: WorldTheme }) {
  const remote = useRemote(fetchDailyStatus);
  const [claim, setClaim] = useState<DailyClaim | null>(null);
  const [isFolded, setIsFolded] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** セリフを選ぶ乱数。描き直しても変えない。 */
  const [pick] = useState(() => Math.random());

  const status = remote.data;
  if (status === null || isClosed) return null;
  // 今日もう受け取っていれば、何も出さない。
  if (claim === null && status.claimed.includes("login")) return null;

  async function handleClaim() {
    setIsClaiming(true);
    setError(null);
    const result = await claimDaily("login", theme.id);
    setIsClaiming(false);
    if (result.ok) setClaim(result.value);
    else setError(result.error);
  }

  if (isFolded) {
    return (
      <button
        type="button"
        onClick={() => setIsFolded(false)}
        className={SECONDARY_BUTTON}
      >
        ログインボーナスを受け取る
      </button>
    );
  }

  const greeting = greetingFor(status);
  const mood =
    greeting === null ? null : greeting.kind === "missed" && claim === null ? "sad" : "happy";

  return (
    <section
      aria-label="今日のあいさつ"
      className={`${PANEL} lg:flex-row lg:items-center`}
    >
      {mood !== null && theme.character.images !== null && (
        <div
          className="greeting-art relative overflow-hidden rounded-[min(var(--decor-radius),12px)] lg:w-2/5 lg:shrink-0"
          data-mood={mood}
        >
          <CharacterArt theme={theme} kind={mood} />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <h2 className={HEADING}>今日のログインボーナス</h2>
        <p className="font-display leading-relaxed">
          {theme.character.name}「{lineFor(theme, status, claim, pick)}」
        </p>
        {claim === null ? (
          <>
            <p className="text-sm">{preview(status)}</p>
            {error !== null && (
              <p role="alert" className={ALERT}>
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={() => void handleClaim()}
              disabled={isClaiming}
              className={PRIMARY_BUTTON}
            >
              受け取る
            </button>
            <button
              type="button"
              onClick={() => setIsFolded(true)}
              className="self-end text-sm underline"
            >
              あとで
            </button>
          </>
        ) : (
          <>
            <p role="status" className="text-sm">
              受け取りました：{rewardText(claim)}。{claim.streak}日連続ログイン中！
            </p>
            <button
              type="button"
              onClick={() => setIsClosed(true)}
              className={SECONDARY_BUTTON}
            >
              閉じる
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function pickLine<T extends string>(lines: readonly T[], pick: number): T | "" {
  return lines[Math.floor(pick * lines.length)] ?? lines[0] ?? "";
}

function lineFor(
  theme: WorldTheme,
  status: DailyStatus,
  claim: DailyClaim | null,
  pick: number,
): string {
  const { missed, returned, milestone } = theme.character.greeting;
  const greeting = greetingFor(status);
  if (greeting?.kind === "missed") {
    return pickLine(claim === null ? missed : returned, pick);
  }
  if (greeting?.kind === "milestone") {
    return fillDays(pickLine(milestone, pick), greeting.days);
  }
  return pickLine(theme.cheers.welcome, pick);
}

/** 受け取る前に見せる、もらえるものと連続日数。 */
function preview(status: DailyStatus): string {
  const streakToday = status.streak + 1;
  const reward = loginReward(streakToday);
  const parts = [`券${reward.tickets}枚${reward.material === null ? "" : "とレアの素材"}`];
  const greeting = greetingFor(status);
  if (greeting?.kind === "missed") parts.push(`${greeting.days}日ぶりのログイン`);
  else if (streakToday >= 2) parts.push(`今日で${streakToday}日連続`);
  return parts.join("・");
}

function rewardText(claim: DailyClaim): string {
  const parsed = claim.itemId === null ? null : parseItemId(claim.itemId);
  const material =
    parsed === null
      ? ""
      : `、素材「${themes[parsed.world].gacha.prizes[parsed.slot].name}」`;
  return `券${claim.tickets}枚${material}`;
}
