import Image from "next/image";
import {
  GACHA_RARITIES,
  prizeKind,
  starsOf,
  MAX_STARS,
  type GachaSlot,
  type RarityId,
} from "@/domain/gacha";
import type { WorldTheme } from "@/themes/types";
import { CharacterArt } from "./CharacterArt";

type Props = {
  theme: WorldTheme;
  slot: GachaSlot;
  rarity: RarityId;
  /** 持っている数。null なら、まだ持っていない。 */
  copies: number | null;
  isNew?: boolean;
  /** 図鑑では、セリフを省いて小さく見せる。 */
  isCompact?: boolean;
  /** 引いた結果では、持っている数と★を出さない。 */
  hidesCount?: boolean;
};

/** ガチャの景品。レアリティごとの枠で囲む。 */
export function PrizeCard({
  theme,
  slot,
  rarity,
  copies,
  isNew = false,
  isCompact = false,
  hidesCount = false,
}: Props) {
  const label = GACHA_RARITIES.find(({ id }) => id === rarity)?.label ?? "";
  const short = GACHA_RARITIES.find(({ id }) => id === rarity)?.short ?? "";
  const prize = theme.gacha.prizes[slot];
  const kind = prizeKind(slot);
  const hasArt = kind === "character" || kind === "parallel";

  return (
    <div className="prize-frame h-full" data-rarity={rarity}>
      <article
        aria-label={copies === null ? `${label}：まだ持っていない景品` : `${label}：${prize.name}`}
        className="flex h-full flex-col gap-2 overflow-hidden bg-background p-3"
      >
        <p className="flex items-center justify-between gap-2 text-xs">
          <span className="rounded-full border border-accent bg-surface px-2 py-0.5 font-bold">
            {short}
          </span>
          {isNew && (
            <span className="rounded-full bg-primary px-2 py-0.5 font-bold text-background">
              NEW
            </span>
          )}
        </p>
        {copies === null ? (
          <p className="font-display text-lg opacity-60">？？？</p>
        ) : (
          <>
            {hasArt && !isCompact && <PrizeArt theme={theme} image={prize.image} />}
            <p className="font-display leading-snug break-words">{prize.name}</p>
            {!isCompact && (
              <p className="text-sm leading-relaxed break-words">
                {kind === "material" ? prize.text : `「${prize.text}」`}
              </p>
            )}
            {!hidesCount && <Count slot={slot} copies={copies} />}
          </>
        )}
      </article>
    </div>
  );
}

/** 景品だけの絵があれば使い、なければ世界線の一枚絵を見せる。 */
function PrizeArt({ theme, image }: { theme: WorldTheme; image?: string }) {
  if (image === undefined) return <CharacterArt theme={theme} kind="scene" />;
  return (
    <Image
      src={image}
      alt=""
      width={896}
      height={560}
      sizes="(min-width: 1024px) 30vw, 90vw"
      className="aspect-[16/10] w-full object-cover"
    />
  );
}

function Count({ slot, copies }: { slot: GachaSlot; copies: number }) {
  const stars = starsOf(slot, copies);
  if (stars === null) {
    return <p className="mt-auto text-xs tabular-nums">持っている数：{copies}</p>;
  }
  return (
    <p className="mt-auto text-xs">
      <span className="sr-only">
        重なり ★{stars}（最大{MAX_STARS}）
      </span>
      <span aria-hidden="true" className="tracking-widest text-primary">
        {"★".repeat(stars)}
        <span className="opacity-30">{"★".repeat(MAX_STARS - stars)}</span>
      </span>
    </p>
  );
}
