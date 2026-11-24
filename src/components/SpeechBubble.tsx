type Props = {
  name: string;
  lines: readonly string[];
  className: string;
};

/** キャラクターのセリフ。 */
export function SpeechBubble({ name, lines, className }: Props) {
  return (
    <div className={`panel relative px-4 pt-5 pb-3 ${className}`}>
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
  );
}
