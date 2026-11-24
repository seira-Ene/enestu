import { MISTAKE_REASONS, type MistakeReason } from "@/domain/quiz";

export const MISTAKE_LABELS: Readonly<Record<MistakeReason, string>> = {
  knowledge: "知識不足",
  understanding: "理解不足",
  careless: "ケアレス",
};

type Props = {
  value: MistakeReason | null;
  disabled: boolean;
  /** 選択中のものをもう一度押すと、null（未分類）に戻る。 */
  onChange: (reason: MistakeReason | null) => void;
};

export function MistakeReasonPicker({ value, disabled, onChange }: Props) {
  return (
    <fieldset disabled={disabled} className="flex flex-col gap-2">
      <legend className="pb-2 text-sm text-accent">
        まちがえた原因（選ばなくてもOK）
      </legend>
      <div className="grid grid-cols-3 gap-2">
        {MISTAKE_REASONS.map((reason) => {
          const isSelected = reason === value;
          return (
            <button
              key={reason}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(isSelected ? null : reason)}
              className={`rounded-xl border px-1 py-3 text-sm font-bold disabled:opacity-50 ${
                isSelected
                  ? "border-primary bg-primary text-background"
                  : "border-accent text-text"
              }`}
            >
              {isSelected && <span aria-hidden="true">✓ </span>}
              {MISTAKE_LABELS[reason]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
