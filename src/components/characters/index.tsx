import type { ComponentType } from "react";
import type { CharacterMood, WorldId, WorldTheme } from "@/themes/types";
import { CharacterFace } from "./CharacterFace";
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

/** 世界線のキャラクターの顔。画像があればそれを、なければSVGを出す。 */
export function CharacterPortrait({
  theme,
  mood,
}: {
  theme: WorldTheme;
  mood: CharacterMood;
}) {
  const { images } = theme.character;
  if (images !== null) return <CharacterFace src={images.face} mood={mood} />;
  const Portrait = PORTRAITS[theme.id];
  return <Portrait mood={mood} />;
}
