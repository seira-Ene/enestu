type Props<Id extends string> = {
  label: string;
  modes: readonly { readonly id: Id; readonly label: string }[];
  current: Id;
  onChange: (id: Id) => void;
};

/** 画面の中の切り替え。 */
export function ModeTabs<Id extends string>({
  label,
  modes,
  current,
  onChange,
}: Props<Id>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="panel grid gap-2 p-2"
      style={{ gridTemplateColumns: `repeat(${modes.length}, minmax(0, 1fr))` }}
    >
      {modes.map((mode) => (
        <button
          key={mode.id}
          type="button"
          aria-pressed={current === mode.id}
          onClick={() => onChange(mode.id)}
          className={`font-display rounded-[var(--decor-button-radius)] px-2 py-2 ${
            current === mode.id ? "bg-primary text-background" : "text-text"
          }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
