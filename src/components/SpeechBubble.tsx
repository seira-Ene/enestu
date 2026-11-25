type Props = {
  name: string;
  lines: readonly string[];
  className: string;
  /** 話しかけられるときだけ渡す。 */
  onTalk?: () => void;
};

/** キャラクターのセリフ。 */
export function SpeechBubble({ name, lines, className, onTalk }: Props) {
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
      {onTalk !== undefined && (
        <>
          {/* 吹き出し全体を押せるようにする。読み上げとキー操作は、下のボタンが受け持つ。 */}
          <span
            aria-hidden="true"
            onClick={onTalk}
            className="absolute inset-0 cursor-pointer"
          />
          <button
            type="button"
            onClick={onTalk}
            aria-label={`${name}に話しかける`}
            className="absolute -top-3 right-3 rounded-full border border-primary bg-surface px-3 py-0.5 text-xs text-text"
          >
            話しかける
          </button>
        </>
      )}
    </div>
  );
}
