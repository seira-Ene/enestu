import type { ComponentType } from "react";
import type { CharacterMood, WorldId, WorldTheme } from "@/themes/types";
import { Haruka } from "./Haruka";
import { Lyuka } from "./Lyuka";
import { Michiru } from "./Michiru";
import { Moka } from "./Moka";
import { Toma } from "./Toma";

const PORTRAITS: Readonly<
  Record<WorldId, ComponentType<{ mood: CharacterMood }>>
> = {
  dungeon: Lyuka,
  otome: Toma,
  detective: Michiru,
  live: Haruka,
  cafe: Moka,
};

/** 世界線のキャラクター。自前の画像があればそれを、なければSVGを出す。 */
export function CharacterPortrait({
  theme,
  mood,
}: {
  theme: WorldTheme;
  mood: CharacterMood;
}) {
  const { images } = theme.character;
  if (images !== null) {
    return (
      // 装飾の画像。大きさは親が決め、最適化は不要なため img を使う。
      <span
        aria-hidden="true"
        className="block size-full bg-cover bg-center"
        style={{ backgroundImage: `url("${images[mood]}")` }}
      />
    );
  }
  const Portrait = PORTRAITS[theme.id];
  return <Portrait mood={mood} />;
}
