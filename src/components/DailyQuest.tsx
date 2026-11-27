import Link from "next/link";
import { selectQuestLine } from "@/domain/cheer";
import { formatDuration } from "@/domain/study-time";
import {
  accuracy,
  topMistakeReason,
  toPercent,
  type SubjectStats,
} from "@/domain/subject-stats";
import {
  questProgress,
  type Quest,
  type QuestProgress,
} from "@/domain/weakness";
import type { StatsWithQuest } from "@/lib/stats-api";
import type { Remote } from "@/lib/use-remote";
import type { ThemeQuest } from "@/themes/types";
import { AiQuestAdvisor } from "./AiQuestAdvisor";
import { HEADING, PANEL, PRIMARY_BUTTON } from "./form-styles";
import { MISTAKE_LABELS } from "./MistakeReasonPicker";

type Props = {
  theme: ThemeQuest;
  remote: Remote<StatsWithQuest>;
};

export function DailyQuest({ theme, remote }: Props) {
  const { data, error, reload } = remote;
  return (
    <section aria-label={theme.title} className={PANEL}>
      <h2 className={HEADING}>{theme.title}</h2>
      {error !== null && (
        <div role="alert" className="flex flex-col items-start gap-2">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void reload()}
            className="underline"
          >
            もう一度読み込む
          </button>
        </div>
      )}
      {data === null && error === null && <p>読み込んでいます…</p>}
      {data !== null && <QuestBody theme={theme} data={data} />}
      {data !== null && <AiQuestAdvisor onAdopted={reload} />}
    </section>
  );
}

function QuestBody({ theme, data }: { theme: ThemeQuest; data: StatsWithQuest }) {
  const { quest, stats, aiNote } = data;
  const progress = questProgress(quest, stats);
  const isAchieved = progress?.isAchieved ?? false;
  const reason = reasonText(quest, stats);
  const link = isAchieved ? null : questLink(quest);

  return (
    <>
      {aiNote === null ? (
        <>
          <p className="font-display break-words text-lg">
            {isAchieved && <span aria-hidden="true">✓ </span>}
            {selectQuestLine(theme.lines, quest, isAchieved)}
          </p>
          {reason !== null && (
            <p className="break-words text-sm opacity-80">{reason}</p>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-accent">AIの提案（Gemini）</p>
          <p className="font-display break-words text-lg">
            {isAchieved && <span aria-hidden="true">✓ </span>}
            {aiNote.title}
          </p>
          <ol aria-label="やること" className="flex list-decimal flex-col gap-1 pl-5 text-sm">
            {aiNote.steps.map((step) => (
              <li key={step} className="break-words">
                {step}
              </li>
            ))}
          </ol>
          <p className="break-words text-sm opacity-80">{aiNote.reason}</p>
        </div>
      )}
      {progress !== null && (
        <QuestMeter quest={quest} progress={progress} title={theme.title} />
      )}
      {link !== null && (
        <Link href={link.href} className={PRIMARY_BUTTON}>
          {theme.start}（{link.label}）
        </Link>
      )}
    </>
  );
}

function QuestMeter({
  quest,
  progress,
  title,
}: {
  quest: Quest;
  progress: QuestProgress;
  title: string;
}) {
  const format = (value: number) =>
    quest.kind === "neglected" ? formatDuration(value) : `${value}問`;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-right text-sm tabular-nums">
        {format(progress.current)} / {format(progress.goal)}
      </p>
      <div
        role="meter"
        aria-label={`${title}の進み具合`}
        aria-valuemin={0}
        aria-valuemax={progress.goal}
        aria-valuenow={progress.current}
        className="h-2 overflow-hidden rounded-full bg-background"
      >
        <div
          className="h-full rounded-r bg-primary motion-safe:transition-[width]"
          style={{ width: `${(progress.current / progress.goal) * 100}%` }}
        />
      </div>
    </div>
  );
}

/** なぜこのクエストなのかを、集計の数字で説明する。 */
function reasonText(
  quest: Quest,
  stats: readonly SubjectStats[],
): string | null {
  if (quest.kind !== "weak" && quest.kind !== "neglected") return null;
  const target = stats.find((item) => item.subject === quest.subject);
  if (target === undefined) return null;
  if (quest.kind === "neglected") {
    return `直近30日の学習時間：${formatDuration(target.studySeconds)}`;
  }
  const rate = accuracy(target);
  if (rate === null) return null;
  const top = topMistakeReason(target);
  const cause = top === null ? "" : `／多い原因：${MISTAKE_LABELS[top]}`;
  return `正答率${toPercent(rate)}%（${target.answerCount}問中${target.correctCount}問）${cause}`;
}

function questLink(quest: Quest): { href: string; label: string } | null {
  switch (quest.kind) {
    case "weak":
      return {
        href: `/quiz?subject=${encodeURIComponent(quest.subject)}`,
        label: "テスト",
      };
    case "neglected":
      return {
        href: `/?subject=${encodeURIComponent(quest.subject)}`,
        label: "タイマー",
      };
    case "starter":
      return { href: "/quiz", label: "テスト" };
    case "clear":
      return null;
  }
}
