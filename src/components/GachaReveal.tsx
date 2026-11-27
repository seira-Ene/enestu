import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  GACHA_RARITIES,
  highestRarity,
  parseItemId,
  pullSummary,
  rarityRank,
  spotlightPulls,
  type Pull,
} from "@/domain/gacha";
import type { WorldTheme } from "@/themes/types";
import { PRIMARY_BUTTON } from "./form-styles";
import { PrizeCard } from "./PrizeCard";
import { useSound } from "./SoundProvider";

export type RevealedPull = Pull & { readonly isNew: boolean };

type Props = {
  theme: WorldTheme;
  /** null なら閉じている。 */
  pulls: readonly RevealedPull[] | null;
  /** 引くたびに変わる番号。同じ結果が続いても、演出を最初からやり直す。 */
  drawId: number;
  onClose: () => void;
};

/** ためる → めくる → ウルトラレア以上を1枚ずつ → まとめ。 */
type Stage =
  | { readonly kind: "charge" }
  | { readonly kind: "flip" }
  | { readonly kind: "spotlight"; readonly index: number }
  | { readonly kind: "done" };

/** 光がたまる時間。 */
export const CHARGE_MS = 1400;
/** 1枚めくるごとの間。 */
export const FLIP_STEP_MS = 140;
const FLIP_MS = 500;

/** 引いたときの演出。動きを減らす設定なら、すぐにまとめを見せる。 */
export function GachaReveal({ theme, pulls, drawId, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const isOpen = pulls !== null;

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="gacha-reveal-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="panel m-auto max-h-[92dvh] w-[calc(100%-1rem)] max-w-2xl overflow-y-auto p-4 text-text backdrop:bg-background/90"
    >
      {/* 引くたびに最初から演出する。 */}
      {pulls !== null && (
        <Reveal key={drawId} theme={theme} pulls={pulls} onClose={onClose} />
      )}
    </dialog>
  );
}

function Reveal({
  theme,
  pulls,
  onClose,
}: {
  theme: WorldTheme;
  pulls: readonly RevealedPull[];
  onClose: () => void;
}) {
  const [stage, setStage] = useState<Stage>(() =>
    prefersReducedMotion() ? { kind: "done" } : { kind: "charge" },
  );
  const spotlights = spotlightPulls(pulls);
  const highest = highestRarity(pulls);
  const { play } = useSound();
  const count = pulls.length;

  /** その場面に入ったときの音。isFirst は、最初に開いた場面か。 */
  const playFor = useCallback(
    (next: Stage, isFirst: boolean) => {
      const rank = rarityRank(highest);
      if (next.kind === "charge") play("orb");
      if (next.kind === "flip") {
        for (let index = 0; index < count; index += 1) {
          play("flip", (index * FLIP_STEP_MS) / 1000);
        }
        // スペシャルレア以上が混ざっていれば、めくり終わりに鈴を鳴らす。
        if (rank >= rarityRank("sr")) {
          play("rare", (FLIP_STEP_MS * (count - 1) + FLIP_MS) / 1000);
        }
      }
      if (next.kind === "spotlight") play("fanfare");
      // 演出なしでまとめから見せるときも、珍しいものが出たことは音で伝える。
      if (next.kind === "done" && isFirst) {
        if (rank >= rarityRank("ur")) play("fanfare");
        else if (rank >= rarityRank("sr")) play("rare");
      }
    },
    [play, highest, count],
  );

  const goTo = useCallback(
    (next: Stage) => {
      setStage(next);
      playFor(next, false);
    },
    [playFor],
  );

  // 開いたときの場面の音は、1回だけ鳴らす。
  const hasStarted = useRef(false);
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    playFor(stage, true);
  }, [playFor, stage]);

  useEffect(() => {
    if (stage.kind === "charge") {
      const timer = setTimeout(() => goTo({ kind: "flip" }), CHARGE_MS);
      return () => clearTimeout(timer);
    }
    if (stage.kind === "flip") {
      const timer = setTimeout(
        () =>
          goTo(spotlights.length > 0 ? { kind: "spotlight", index: 0 } : { kind: "done" }),
        FLIP_STEP_MS * (count - 1) + FLIP_MS + 400,
      );
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [stage, spotlights.length, count, goTo]);

  const skip = () => goTo({ kind: "done" });

  return (
    <div className="flex flex-col gap-4">
      <h2 id="gacha-reveal-title" className="font-display text-xl text-primary">
        {stage.kind === "done" ? "ガチャの結果" : "ガチャ"}
      </h2>

      {stage.kind === "charge" && <Charge theme={theme} rarity={highest} />}
      {(stage.kind === "flip" || stage.kind === "done") && (
        <Cards theme={theme} pulls={pulls} isFlipping={stage.kind === "flip"} />
      )}
      {stage.kind === "spotlight" && (
        <Spotlight
          theme={theme}
          pull={spotlights[stage.index]}
          onNext={() =>
            goTo(
              stage.index + 1 < spotlights.length
                ? { kind: "spotlight", index: stage.index + 1 }
                : { kind: "done" },
            )
          }
        />
      )}

      {stage.kind === "done" ? (
        <>
          <p role="status" className="text-sm">
            {pullSummary(pulls)}
          </p>
          <button type="button" onClick={onClose} className={PRIMARY_BUTTON}>
            閉じる
          </button>
        </>
      ) : (
        <button type="button" onClick={skip} className="self-end text-sm underline">
          飛ばす
        </button>
      )}
    </div>
  );
}

/** 光の玉がたまる。色で、いちばん珍しいレアリティをほのめかす。 */
function Charge({ theme, rarity }: { theme: WorldTheme; rarity: Pull["rarity"] }) {
  const { images, name } = theme.character;
  const rank = rarityRank(rarity);
  const message =
    rank >= rarityRank("ur")
      ? "まぶしい……！ これは、すごいよ！"
      : rank >= rarityRank("sr")
        ? "光ってる……！"
        : "なにが出るかな……";
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="gacha-orb prize-frame" data-rarity={rarity} aria-hidden="true" />
      <p className="flex items-center gap-2 font-display">
        {images !== null && (
          <Image
            src={images.face}
            alt=""
            width={40}
            height={40}
            // 演出は短いので、後回しにせず読み込む。
            loading="eager"
            className="size-10 rounded-full"
          />
        )}
        <span>
          {name}：{message}
        </span>
      </p>
    </div>
  );
}

function Cards({
  theme,
  pulls,
  isFlipping,
}: {
  theme: WorldTheme;
  pulls: readonly RevealedPull[];
  isFlipping: boolean;
}) {
  return (
    <ol className={`grid gap-3 ${pulls.length === 1 ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-5"}`}>
      {pulls.map((pull, index) => {
        const parsed = parseItemId(pull.itemId);
        if (parsed === null) return null;
        return (
          <li
            key={pull.seq}
            className={isFlipping ? "gacha-flip" : ""}
            style={isFlipping ? { animationDelay: `${index * FLIP_STEP_MS}ms` } : undefined}
          >
            <PrizeCard
              theme={theme}
              slot={parsed.slot}
              rarity={pull.rarity}
              copies={1}
              isNew={pull.isNew}
              isCompact={pulls.length > 1}
              hidesCount
            />
          </li>
        );
      })}
    </ol>
  );
}

/** ウルトラレア以上を、光の筋の上で大きく見せる。 */
function Spotlight({
  theme,
  pull,
  onNext,
}: {
  theme: WorldTheme;
  pull: RevealedPull | undefined;
  onNext: () => void;
}) {
  const parsed = pull === undefined ? null : parseItemId(pull.itemId);
  if (pull === undefined || parsed === null) return null;
  const label = GACHA_RARITIES.find(({ id }) => id === pull.rarity)?.label;
  return (
    <div className="gacha-burst relative flex flex-col items-center gap-3 overflow-hidden rounded-[min(var(--decor-radius),14px)] p-4" data-rarity={pull.rarity}>
      <p className="font-display relative rounded-full bg-background px-4 py-1 text-2xl text-primary">
        {label}！
      </p>
      <div className="gacha-pop relative w-full max-w-sm">
        <PrizeCard
          theme={theme}
          slot={parsed.slot}
          rarity={pull.rarity}
          copies={1}
          isNew={pull.isNew}
          hidesCount
        />
      </div>
      <button type="button" onClick={onNext} className={`relative ${PRIMARY_BUTTON}`}>
        次へ
      </button>
    </div>
  );
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
