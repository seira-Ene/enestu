import type { ThemeCharacter } from "@/themes/types";

type Props = {
  character: ThemeCharacter;
  lines: readonly string[];
};

export function CharacterPanel({ character, lines }: Props) {
  return (
    <section
      aria-label={`${character.name}の応援`}
      className="flex items-start gap-3"
    >
      <div className="flex w-16 shrink-0 flex-col items-center gap-1">
        <span
          aria-hidden="true"
          className="flex size-16 items-center justify-center rounded-full border-2 border-primary bg-surface text-3xl"
        >
          {character.emoji}
        </span>
        <span className="text-xs text-accent">{character.name}</span>
      </div>
      <div
        aria-live="polite"
        className="min-h-16 flex-1 rounded-2xl rounded-tl-none bg-surface px-4 py-3 leading-relaxed"
      >
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </section>
  );
}
