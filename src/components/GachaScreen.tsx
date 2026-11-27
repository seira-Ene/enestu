"use client";

import { useState } from "react";
import {
  GACHA_RARITIES,
  GACHA_SLOTS,
  gachaItemId,
  markNew,
  parseItemId,
  PITY_FLOOR,
  PULL_COUNTS,
  pullsUntilPity,
  rarityRates,
  TEN_PULL_FLOOR,
  ticketsLeft,
  XP_PER_TICKET,
  type Pull,
  type PullCount,
} from "@/domain/gacha";
import { fetchGacha, pullGacha, type GachaState } from "@/lib/gacha-api";
import { useRemote, type Remote } from "@/lib/use-remote";
import type { WorldTheme } from "@/themes/types";
import { ALERT, HEADING, PANEL, PRIMARY_BUTTON, SECONDARY_BUTTON } from "./form-styles";
import { GachaReveal } from "./GachaReveal";
import { PrizeCard } from "./PrizeCard";
import { ScreenHeader } from "./ScreenHeader";
import { ScreenLayout } from "./ScreenLayout";
import { useWorld } from "./WorldProvider";

type Result = Pull & { readonly isNew: boolean };

export function GachaScreen() {
  const { theme } = useWorld();
  const remote = useRemote(fetchGacha);
  const [results, setResults] = useState<readonly Result[] | null>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 演出の中の結果。閉じたら null。 */
  const [revealing, setRevealing] = useState<readonly Result[] | null>(null);
  const [drawId, setDrawId] = useState(0);

  async function handlePull(count: PullCount) {
    const before = remote.data?.collection ?? [];
    setIsPulling(true);
    setError(null);
    const result = await pullGacha(theme.id, count);
    if (result.ok) {
      const marked = markNew(result.value, before);
      setResults(marked);
      setRevealing(marked);
      setDrawId((id) => id + 1);
    } else {
      setError(result.error);
    }
    await remote.reload();
    setIsPulling(false);
  }

  return (
    <ScreenLayout>
      <ScreenHeader title="ガチャ" subtitle={`${theme.displayName}の景品`} />
      {/* PC版では、左に引くところと結果、右に図鑑を並べる。 */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(20rem,1fr)_minmax(0,1.6fr)] lg:items-start">
        <div className="flex flex-col gap-5">
          <TicketPanel
            remote={remote}
            isPulling={isPulling}
            error={error}
            onPull={(count) => void handlePull(count)}
          />
          {results !== null && <ResultPanel theme={theme} results={results} />}
        </div>
        <CollectionPanel theme={theme} state={remote.data} />
      </div>
      <GachaReveal
        theme={theme}
        pulls={revealing}
        drawId={drawId}
        onClose={() => setRevealing(null)}
      />
    </ScreenLayout>
  );
}

function TicketPanel({
  remote,
  isPulling,
  error,
  onPull,
}: {
  remote: Remote<GachaState>;
  isPulling: boolean;
  error: string | null;
  onPull: (count: PullCount) => void;
}) {
  const { data, reload } = remote;
  const tickets = data === null ? 0 : ticketsLeft(data.status);

  return (
    <section aria-label="ガチャを引く" className={PANEL}>
      <h2 className={HEADING}>ガチャを引く</h2>
      {remote.error !== null && (
        <div role="alert" className="flex flex-col items-start gap-2">
          <p>{remote.error}</p>
          <button type="button" onClick={() => void reload()} className="underline">
            もう一度読み込む
          </button>
        </div>
      )}
      {data === null && remote.error === null && <p>読み込んでいます…</p>}
      {data !== null && (
        <>
          <p className="flex items-baseline justify-between gap-2">
            <span>持っている券</span>
            <span className="font-display text-2xl text-primary tabular-nums">
              {tickets}枚
            </span>
          </p>
          <p className="text-sm">
            ウルトラレア以上が確定まで、あと
            <span className="tabular-nums">{pullsUntilPity(data.status)}</span>回
          </p>
        </>
      )}
      <div className="grid grid-cols-2 gap-3">
        {PULL_COUNTS.map((count) => (
          <button
            key={count}
            type="button"
            onClick={() => onPull(count)}
            disabled={isPulling || tickets < count}
            className={count === 1 ? SECONDARY_BUTTON : PRIMARY_BUTTON}
          >
            {count === 1 ? "単発" : "10連"}
            <span className="block text-xs">券{count}枚</span>
          </button>
        ))}
      </div>
      {error !== null && (
        <p role="alert" className={ALERT}>
          {error}
        </p>
      )}
      <p className="text-xs">
        経験値{XP_PER_TICKET}ごとに、券を1枚もらえます（学習30分か、正解12問）。
        10連では、スペシャルレア以上が1枚以上出ます。
      </p>
      <Rates />
    </section>
  );
}

function Rates() {
  const label = (id: string) =>
    GACHA_RARITIES.find((rarity) => rarity.id === id)?.label ?? id;
  const tables = [
    { title: "ふだん", rates: rarityRates() },
    { title: "10連の10回目（スペシャルレア以上が出ていないとき）", rates: rarityRates(TEN_PULL_FLOOR) },
    { title: "確定の回", rates: rarityRates(PITY_FLOOR) },
  ];
  return (
    <details>
      <summary className="cursor-pointer text-sm">提供割合</summary>
      <div className="mt-2 flex flex-col gap-3 text-sm">
        {tables.map(({ title, rates }) => (
          <table key={title} className="w-full">
            <caption className="text-left text-xs opacity-80">{title}</caption>
            <tbody>
              {rates.map(({ id, percent }) => (
                <tr key={id}>
                  <th scope="row" className="py-0.5 text-left font-normal">
                    {label(id)}
                  </th>
                  <td className="text-right tabular-nums">{percent.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
        <p className="text-xs opacity-80">
          同じレアリティの中では、どの景品も同じ割合で出ます。
        </p>
      </div>
    </details>
  );
}

function ResultPanel({
  theme,
  results,
}: {
  theme: WorldTheme;
  results: readonly Result[];
}) {
  return (
    <section aria-label="引いた結果" className={PANEL}>
      <h2 className={HEADING}>引いた結果</h2>
      <ol className="grid grid-cols-2 gap-3">
        {results.map((pull) => {
          const parsed = parseItemId(pull.itemId);
          if (parsed === null) return null;
          return (
            <li key={pull.seq} className={results.length === 1 ? "col-span-2" : ""}>
              <PrizeCard
                theme={theme}
                slot={parsed.slot}
                rarity={pull.rarity}
                copies={1}
                isNew={pull.isNew}
                hidesCount
              />
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function CollectionPanel({
  theme,
  state,
}: {
  theme: WorldTheme;
  state: GachaState | null;
}) {
  const copiesOf = (itemId: string) =>
    state?.collection.find((item) => item.itemId === itemId)?.copies ?? null;
  const owned = GACHA_SLOTS.filter(
    ({ slot }) => copiesOf(gachaItemId(theme.id, slot)) !== null,
  ).length;

  return (
    <section aria-label="図鑑" className={PANEL}>
      <h2 className={HEADING}>
        {theme.displayName}の図鑑（{owned} / {GACHA_SLOTS.length}）
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {GACHA_SLOTS.map(({ slot, rarity }) => (
          <li key={slot}>
            <PrizeCard
              theme={theme}
              slot={slot}
              rarity={rarity}
              copies={copiesOf(gachaItemId(theme.id, slot))}
              isCompact
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
