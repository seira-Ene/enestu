import { useState } from "react";
import {
  ALL_CLEAR_REWARD,
  canClaim,
  MISSIONS,
  missionProgress,
  type DailyKind,
  type DailyStatus,
  type MissionKind,
} from "@/domain/daily";
import { claimDaily } from "@/lib/daily-api";
import type { Remote } from "@/lib/use-remote";
import type { WorldId } from "@/themes/types";
import { ALERT, HEADING, ITEM, PANEL } from "./form-styles";
import { rewardPreview, rewardText } from "./reward-text";

type Props = {
  remote: Remote<DailyStatus>;
  /** 素材を選ぶ世界線。 */
  world: WorldId;
};

/** 今日のミッション。達成したら、報酬を受け取れる。条件と報酬はDBが決める。 */
export function DailyMissions({ remote, world }: Props) {
  const { data, error, reload } = remote;
  const [claiming, setClaiming] = useState<DailyKind | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  async function handleClaim(kind: DailyKind) {
    setClaiming(kind);
    setNotice(null);
    setClaimError(null);
    const result = await claimDaily(kind, world);
    if (result.ok) setNotice(`受け取りました：${rewardText(result.value)}`);
    else setClaimError(result.error);
    await reload();
    setClaiming(null);
  }

  return (
    <section aria-label="今日のミッション" className={PANEL}>
      <h2 className={HEADING}>今日のミッション</h2>
      {error !== null && (
        <div role="alert" className="flex flex-col items-start gap-2">
          <p>{error}</p>
          <button type="button" onClick={() => void reload()} className="underline">
            もう一度読み込む
          </button>
        </div>
      )}
      {data === null && error === null && <p>読み込んでいます…</p>}
      {data !== null && (
        <ul className="flex flex-col gap-2">
          {MISSIONS.map((mission) => (
            <MissionRow
              key={mission.kind}
              status={data}
              kind={mission.kind}
              label={mission.label}
              reward={rewardPreview(mission.reward)}
              isClaiming={claiming !== null}
              onClaim={() => void handleClaim(mission.kind)}
            />
          ))}
          <li className={ITEM}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold">全部達成ボーナス</p>
                <p className="text-xs">
                  3つとも受け取る・{rewardPreview(ALL_CLEAR_REWARD)}
                </p>
              </div>
              <ClaimButton
                label="全部達成ボーナス"
                isClaimed={data.claimed.includes("all_clear")}
                isReady={canClaim(data, "all_clear")}
                isClaiming={claiming !== null}
                onClaim={() => void handleClaim("all_clear")}
              />
            </div>
          </li>
        </ul>
      )}
      {notice !== null && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
      {claimError !== null && (
        <p role="alert" className={ALERT}>
          {claimError}
        </p>
      )}
    </section>
  );
}

function MissionRow({
  status,
  kind,
  label,
  reward,
  isClaiming,
  onClaim,
}: {
  status: DailyStatus;
  kind: MissionKind;
  label: string;
  reward: string;
  isClaiming: boolean;
  onClaim: () => void;
}) {
  const { current, goal } = missionProgress(status, kind);
  const shown = kind === "study" ? Math.floor(current / 60) : current;
  const total = kind === "study" ? Math.floor(goal / 60) : goal;
  const unit = { study: "分", answers: "問", explain: "個" }[kind];

  return (
    <li className={`${ITEM} flex flex-col gap-2`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold">{label}</p>
          <p className="text-xs">{reward}</p>
        </div>
        <ClaimButton
          label={label}
          isClaimed={status.claimed.includes(kind)}
          isReady={canClaim(status, kind)}
          isClaiming={isClaiming}
          onClaim={onClaim}
        />
      </div>
      <div className="flex items-center gap-2">
        <div
          role="meter"
          aria-label={`${label}の進み具合`}
          aria-valuemin={0}
          aria-valuemax={goal}
          aria-valuenow={current}
          className="h-2 flex-1 overflow-hidden rounded-full border border-accent bg-surface"
        >
          <div
            className="h-full bg-accent motion-safe:transition-[width]"
            style={{ width: `${(current / goal) * 100}%` }}
          />
        </div>
        <span className="text-xs tabular-nums">
          {shown} / {total}
          {unit}
        </span>
      </div>
    </li>
  );
}

function ClaimButton({
  label,
  isClaimed,
  isReady,
  isClaiming,
  onClaim,
}: {
  label: string;
  isClaimed: boolean;
  isReady: boolean;
  isClaiming: boolean;
  onClaim: () => void;
}) {
  if (isClaimed) {
    return <span className="shrink-0 text-xs opacity-80">受け取り済み</span>;
  }
  if (!isReady) return <span className="shrink-0 text-xs opacity-60">未達成</span>;
  return (
    <button
      type="button"
      onClick={onClaim}
      disabled={isClaiming}
      aria-label={`${label}の報酬を受け取る`}
      className="button-primary shrink-0 px-3 py-2 text-sm disabled:opacity-50"
    >
      受け取る
    </button>
  );
}
