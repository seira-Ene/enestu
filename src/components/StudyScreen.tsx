"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { selectCheers, studyMood, type StudyStatus } from "@/domain/cheer";
import { fillHeroName } from "@/domain/hero-name";
import { burstLinesFor } from "@/domain/talk";
import { levelState, unlockedRankCount } from "@/domain/progress";
import { parseSubject } from "@/domain/validation";
import {
  elapsedSeconds,
  filterTodayLogs,
  sumTodaySeconds,
  type StudyLog,
} from "@/domain/study-time";
import { getPageAccountId } from "@/lib/account-marker";
import type { ApiResult } from "@/lib/api-client";
import {
  getActiveSession,
  setActiveSession,
  useActiveSession,
  type ActiveSession,
} from "@/lib/active-session";
import { fetchProgress } from "@/lib/progress-api";
import { fetchStats } from "@/lib/stats-api";
import { fetchDailyStatus } from "@/lib/daily-api";
import { fetchTodayLogs, saveStudyLog } from "@/lib/study-log-api";
import { useRemote } from "@/lib/use-remote";
import { CharacterHero } from "./CharacterHero";
import { DailyGreeting } from "./DailyGreeting";
import { DailyMissions } from "./DailyMissions";
import { DailyQuest } from "./DailyQuest";
import { LevelPanel } from "./LevelPanel";
import { LevelUpBanner } from "./LevelUpBanner";
import { ScreenHeader } from "./ScreenHeader";
import { ScreenLayout } from "./ScreenLayout";
import { useSettings } from "./SettingsProvider";
import { StudyHistory } from "./StudyHistory";
import { StudyTimer, type TimerPhase } from "./StudyTimer";
import { useWorld } from "./WorldProvider";

export function StudyScreen() {
  const { theme } = useWorld();
  const heroName = useSettings().data?.heroName ?? null;
  const session = useActiveSession();
  const now = useNow();
  const stats = useRemote(fetchStats);
  const progress = useRemote(fetchProgress);
  const daily = useRemote(fetchDailyStatus);
  /** 直前の記録を保存する前のレベル。 */
  const [previousLevel, setPreviousLevel] = useState<number | null>(null);
  /** URLの ?subject= で指定された科目。 */
  const requested = useSearchParams().get("subject");
  /** 入力した科目名。URLの指定が変わったら無効になる。 */
  const [typed, setTyped] = useState<{
    requested: string | null;
    subject: string;
  } | null>(null);
  const subjectInput =
    typed !== null && typed.requested === requested
      ? typed.subject
      : (requested ?? "");
  const [logs, setLogs] = useState<StudyLog[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<ActiveSession | null>(null);

  const latestLoad = useRef(0);

  const applyLoad = useCallback(
    (loadId: number, result: ApiResult<StudyLog[]>) => {
      // 後から始めた読み込みがあれば、遅れて届いた古い結果は捨てる。
      if (loadId !== latestLoad.current) return;
      if (result.ok) {
        setLogs(result.value);
        setLoadError(null);
      } else {
        setLoadError(result.error);
      }
    },
    [],
  );

  async function loadLogs() {
    const loadId = ++latestLoad.current;
    applyLoad(loadId, await fetchTodayLogs());
  }

  useEffect(() => {
    const loadId = ++latestLoad.current;
    void fetchTodayLogs().then((result) => applyLoad(loadId, result));
  }, [applyLoad]);

  function handleStart() {
    const subject = parseSubject(subjectInput);
    if (!subject.ok) {
      setMessage(subject.error);
      return;
    }
    // 別のタブで計測が始まっていたら、上書きしない。
    if (getActiveSession() !== null) return;
    setMessage(null);
    setLastSaved(null);
    setPreviousLevel(null);
    setActiveSession({
      id: crypto.randomUUID(),
      accountId: getPageAccountId(),
      subject: subject.value,
      startedAt: new Date().toISOString(),
      endedAt: null,
    });
  }

  function handleStop() {
    const current = getActiveSession();
    if (current === null || current.endedAt !== null) return;
    const endedAt = new Date();
    if (elapsedSeconds(current.startedAt, endedAt) < 1) {
      setMessage("1秒以上計測してから停止してください。");
      return;
    }
    // 先に保存待ちにしておき、通信中に閉じられても記録を失わない。
    setActiveSession({ ...current, endedAt: endedAt.toISOString() });
    void save();
  }

  async function save() {
    const current = getActiveSession();
    if (current === null || current.endedAt === null) return;
    if (current.accountId !== getPageAccountId()) {
      setMessage(
        "計測を始めたときとログインの状態が違うため、保存できません。元の状態に戻してから、もう一度保存してください。",
      );
      return;
    }
    setIsSaving(true);
    setMessage(null);
    const result = await saveStudyLog({
      id: current.id,
      subject: current.subject,
      startedAt: current.startedAt,
      endedAt: current.endedAt,
    });
    if (!result.ok) {
      setMessage(`${result.error}（記録はこの端末に残っています）`);
      setIsSaving(false);
      return;
    }
    setPreviousLevel(progress.data && levelState(progress.data).level);
    await Promise.all([
      loadLogs(),
      stats.reload(),
      progress.reload(),
      daily.reload(),
    ]);
    if (getActiveSession()?.id === current.id) setActiveSession(null);
    setTyped({ requested, subject: current.subject });
    setLastSaved(current);
    setIsSaving(false);
  }

  function handleDiscard() {
    if (!window.confirm("この計測を記録せずに終了しますか？")) return;
    setActiveSession(null);
    setMessage(null);
  }

  const todayLogs =
    logs !== null && now !== null ? filterTodayLogs(logs, now) : null;
  const totalSeconds =
    logs !== null && now !== null ? sumTodaySeconds(logs, now) : null;

  const status = toStatus(session, lastSaved);
  const cheers =
    heroName === null
      ? theme.cheers
      : {
          ...theme.cheers,
          welcome: fillHeroName(theme.cheers.namedWelcome, heroName),
        };
  const lines = selectCheers(cheers, status, {
    seed: cheerSeed(session, lastSaved, todayLogs),
    totalSeconds,
  });

  // 仲良くなるほど、話しかけたときのセリフも増える。
  const storyCount =
    progress.data === null
      ? 0
      : unlockedRankCount(levelState(progress.data).level);
  const talkLines = [
    ...theme.character.talk,
    ...(heroName === null
      ? []
      : fillHeroName(theme.character.namedTalk, heroName)),
    ...theme.progress.stories.slice(0, storyCount),
  ];
  const burstLines = burstLinesFor(theme.character, heroName);

  return (
    <ScreenLayout>
      <ScreenHeader title="エネスタ" subtitle={theme.tagline} />
      <DailyGreeting theme={theme} />
      {/* PC版では、左に絵とレベル、右にタイマーなどを並べる。 */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(20rem,1fr)] lg:grid-rows-[auto_1fr] lg:items-start">
        <CharacterHero
          theme={theme}
          mood={studyMood(status)}
          lines={lines}
          talkLines={talkLines}
          burstLines={burstLines}
        />
        <div className="flex flex-col gap-5 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <LevelUpBanner
            theme={theme}
            totals={progress.data}
            previousLevel={previousLevel}
            // すぐ上に同じ絵がある。
            hasArt={false}
          />
          <StudyTimer
            terms={theme.terms}
            phase={toPhase(session, isSaving)}
            subject={session?.subject ?? subjectInput}
            seconds={toSeconds(session, now)}
            message={message}
            onSubjectChange={(subject) => setTyped({ requested, subject })}
            onStart={handleStart}
            onStop={handleStop}
            onRetry={() => void save()}
            onDiscard={handleDiscard}
          />
          <DailyMissions remote={daily} world={theme.id} />
          <DailyQuest theme={theme.quest} remote={stats} />
          <StudyHistory
            terms={theme.terms}
            logs={todayLogs}
            totalSeconds={totalSeconds}
            error={loadError}
            onReload={() => void loadLogs()}
          />
        </div>
        <LevelPanel theme={theme} remote={progress} />
      </div>
    </ScreenLayout>
  );
}

/** 1秒ごとに更新される現在時刻。サーバーと初回描画では null。 */
function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, []);
  return now;
}

function toStatus(
  session: ActiveSession | null,
  lastSaved: ActiveSession | null,
): StudyStatus {
  if (session !== null) return "running";
  return lastSaved !== null ? "saved" : "idle";
}

function toPhase(session: ActiveSession | null, isSaving: boolean): TimerPhase {
  if (session === null) return "ready";
  if (session.endedAt === null) return "running";
  return isSaving ? "saving" : "unsaved";
}

function toSeconds(session: ActiveSession | null, now: Date | null): number {
  if (session === null) return 0;
  if (session.endedAt !== null) {
    return elapsedSeconds(session.startedAt, new Date(session.endedAt));
  }
  return now === null ? 0 : elapsedSeconds(session.startedAt, now);
}

/** 1秒ごとの再描画でセリフが変わらないよう、状態ごとに固定の値を使う。 */
function cheerSeed(
  session: ActiveSession | null,
  lastSaved: ActiveSession | null,
  todayLogs: readonly StudyLog[] | null,
): number {
  const source = session ?? lastSaved;
  return source !== null
    ? Date.parse(source.startedAt)
    : (todayLogs?.length ?? 0);
}
