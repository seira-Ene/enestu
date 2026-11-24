import type { CharacterMood, WorldTheme } from "@/themes/types";
import { CharacterPortrait } from "./characters";

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
      <div className="panel relative min-h-24 flex-1 px-4 pt-5 pb-3">
        <span className="absolute -top-3 left-3 rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-background">
          {name}
        </span>
        <div aria-live="polite" className="font-display leading-relaxed">
          {lines.map((line) => (
            <p key={line} className="motion-safe:animate-appear">
              {line}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
