import { toPercent } from "@/domain/subject-stats";

/** 割合を、数字と棒で表す。 */
export function RatioBar({
  label,
  ratio,
  value,
}: {
  label: string;
  /** 0〜1。値がなければ null。 */
  ratio: number | null;
  value: string;
}) {
  const percent = ratio === null ? 0 : toPercent(ratio);
  return (
    <div className="flex flex-col gap-1">
      <p className="flex flex-wrap justify-between gap-x-2 text-sm">
        <span className="opacity-80">{label}</span>
        <span className="tabular-nums">{value}</span>
      </p>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={value}
        className="h-2 overflow-hidden rounded-full bg-surface"
      >
        <div
          className="h-full rounded-r bg-accent"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
