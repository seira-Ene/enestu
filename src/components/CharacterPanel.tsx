import type { CharacterMood, WorldTheme } from "@/themes/types";
import { CharacterPortrait } from "./characters";
import { SpeechBubble } from "./SpeechBubble";

type Props = {
  theme: WorldTheme;
  mood: CharacterMood;
  lines: readonly string[];
};

export function CharacterPanel({ theme, mood, lines }: Props) {
  const { name } = theme.character;
  return (
    <section
      aria-label={`${name}の応援`}
      className="flex items-center gap-4"
    >
      <div
        // 表情が変わったら、動きをやり直す。
        key={mood}
        className={`flex w-28 shrink-0 flex-col items-center gap-1 ${
          mood === "happy" ? "motion-safe:animate-hop" : ""
        }`}
      >
        <span className="size-28 rounded-full border-4 border-primary bg-surface">
          <CharacterPortrait theme={theme} mood={mood} />
        </span>
      </div>
      <SpeechBubble name={name} lines={lines} className="min-h-24 flex-1" />
    </section>
  );
}
