import type { CharacterMood, WorldTheme } from "@/themes/types";
import { CharacterArt } from "./CharacterArt";
import { CharacterPanel } from "./CharacterPanel";
import { SpeechBubble } from "./SpeechBubble";

type Props = {
  theme: WorldTheme;
  mood: CharacterMood;
  lines: readonly string[];
};

/** ホームの大きな一枚絵とセリフ。画像のない世界線では、丸い顔で出す。 */
export function CharacterHero({ theme, mood, lines }: Props) {
  const { name, images } = theme.character;
  if (images === null) {
    return <CharacterPanel theme={theme} mood={mood} lines={lines} />;
  }
  return (
    <section aria-label={`${name}の応援`} className="flex flex-col">
      <div
        // 表情が変わったら、動きをやり直す。
        key={mood}
        className={`panel overflow-hidden ${
          mood === "happy" ? "motion-safe:animate-hop" : ""
        }`}
      >
        <CharacterArt theme={theme} kind="hero" />
      </div>
      <SpeechBubble name={name} lines={lines} className="mx-3 -mt-5" />
    </section>
  );
}
