import { MISTAKE_REASONS } from "@/domain/quiz";
import { formatDuration } from "@/domain/study-time";
import {
  accuracy,
  STATS_DAYS,
  studyShare,
  toPercent,
  unclassifiedCount,
  type SubjectStats,
} from "@/domain/subject-stats";
import { isNeglected, isWeak, sortByWeakness } from "@/domain/weakness";
import { HEADING, ITEM, PANEL } from "./form-styles";
import { MISTAKE_LABELS } from "./MistakeReasonPicker";

export function SubjectStatsList({
  stats,
}: {
  stats: readonly SubjectStats[];
}) {
  return (
    <section className={PANEL}>
      <h2 className={HEADING}>科目別の集計（直近{STATS_DAYS}日）</h2>
      {stats.length === 0 ? (
        <p className="opacity-80">
          まだ記録がありません。学習かテストをすると、ここに集計が出ます。
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {sortByWeakness(stats).map((item) => (
            <SubjectRow key={item.subject} item={item} all={stats} />
          ))}
        </ul>
      )}
    </section>
  );
}

function SubjectRow({
  item,
  all,
}: {
  item: SubjectStats;
  all: readonly SubjectStats[];
}) {
  const rate = accuracy(item);
  const share = studyShare(item, all);
  const unclassified = unclassifiedCount(item);
  const mistakes = item.answerCount - item.correctCount;

  return (
    <li className={`${ITEM} flex flex-col gap-3`}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 break-words font-bold">{item.subject}</h3>
        {isWeak(item) && <Badge mark="▼" label="苦手" />}
        {isNeglected(item, all) && <Badge mark="◇" label="学習不足" />}
      </div>

      <Bar
        label="正答率"
        ratio={rate}
        value={
          rate === null
            ? "まだ解いていません"
            : `${toPercent(rate)}%（${item.answerCount}問中${item.correctCount}問）`
        }
      />
      <Bar
        label="学習時間の割合"
        ratio={share}
        value={
          share === null
            ? "まだ記録がありません"
            : `${toPercent(share)}%（${formatDuration(item.studySeconds)}）`
        }
      />

      {mistakes > 0 && (
        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {MISTAKE_REASONS.map((reason) => (
            <Count
              key={reason}
              label={MISTAKE_LABELS[reason]}
              count={item.reasons[reason]}
            />
          ))}
          <Count label="未分類" count={unclassified} />
        </dl>
      )}
    </li>
  );
}

function Badge({ mark, label }: { mark: string; label: string }) {
  return (
    <span className="shrink-0 rounded-full border border-primary px-2 text-xs">
      <span aria-hidden="true">{mark} </span>
      {label}
    </span>
  );
}

function Bar({
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

function Count({ label, count }: { label: string; count: number }) {
  if (count === 0) return null;
  return (
    <div className="flex gap-1">
      <dt className="opacity-80">{label}</dt>
      <dd className="tabular-nums">{count}問</dd>
    </div>
  );
}
