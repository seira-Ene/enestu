"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { selectCheers, type StudyStatus } from "@/domain/cheer";
import { parseSubject } from "@/domain/validation";
import {
  elapsedSeconds,
  filterTodayLogs,
  sumTodaySeconds,
  type StudyLog,
} from "@/domain/study-time";
import type { ApiResult } from "@/lib/api-client";
import {
  getActiveSession,
  setActiveSession,
  useActiveSession,
  type ActiveSession,
} from "@/lib/active-session";
import { fetchTodayLogs, saveStudyLog } from "@/lib/study-log-api";
import type { WorldTheme } from "@/themes/types";
import { CharacterPanel } from "./CharacterPanel";
import { StudyHistory } from "./StudyHistory";
import { StudyTimer, type TimerPhase } from "./StudyTimer";

export function StudyScreen({ theme }: { theme: WorldTheme }) {
  const session = useActiveSession();
  const now = useNow();
  const [subjectInput, setSubjectInput] = useState("");
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
    setActiveSession({
      id: crypto.randomUUID(),
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
    await loadLogs();
    if (getActiveSession()?.id === current.id) setActiveSession(null);
    setSubjectInput(current.subject);
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
  const lines = selectCheers(theme.cheers, status, {
    seed: cheerSeed(session, lastSaved, todayLogs),
    totalSeconds,
  });

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-primary">エネスタ</h1>
        <p className="text-sm text-accent">{theme.displayName}</p>
      </header>
      <CharacterPanel character={theme.character} lines={lines} />
      <StudyTimer
        terms={theme.terms}
        phase={toPhase(session, isSaving)}
        subject={session?.subject ?? subjectInput}
        seconds={toSeconds(session, now)}
        message={message}
        onSubjectChange={setSubjectInput}
        onStart={handleStart}
        onStop={handleStop}
        onRetry={() => void save()}
        onDiscard={handleDiscard}
      />
      <StudyHistory
        terms={theme.terms}
        logs={todayLogs}
        totalSeconds={totalSeconds}
        error={loadError}
        onReload={() => void loadLogs()}
      />
    </main>
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
