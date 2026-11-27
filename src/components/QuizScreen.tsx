"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLayoutEffect, useState } from "react";
import { judgeAnswer } from "@/domain/answer-judge";
import {
  explainMood,
  quizMood,
  selectExplainCheer,
  selectQuizCheer,
  type QuizMoment,
} from "@/domain/cheer";
import type { ExplanationRank } from "@/domain/explanation";
import {
  listSubjects,
  MAX_QUIZ_QUESTIONS,
  rankQuiz,
  scoreQuiz,
  selectQuizCards,
  type MistakeReason,
  type QuizCard,
} from "@/domain/quiz";
import { parseUserAnswer } from "@/domain/quiz-input";
import { comboCount, levelState } from "@/domain/progress";
import { fetchProgress } from "@/lib/progress-api";
import { fetchAnswerLogs, fetchCards, saveAnswerLog } from "@/lib/quiz-api";
import { useRemote } from "@/lib/use-remote";
import { useWide } from "@/lib/use-wide";
import { AnswerHistory } from "./AnswerHistory";
import { CharacterArt } from "./CharacterArt";
import { CharacterPanel } from "./CharacterPanel";
import { ExplainBoard } from "./ExplainBoard";
import { PANEL, PRIMARY_BUTTON, TEXT_INPUT } from "./form-styles";
import { LevelPanel } from "./LevelPanel";
import { LevelUpBanner } from "./LevelUpBanner";
import { ModeTabs } from "./ModeTabs";
import { QuizQuestion, type Judged } from "./QuizQuestion";
import { QuizResult } from "./QuizResult";
import { QuizStage } from "./QuizStage";
import { ScreenHeader } from "./ScreenHeader";
import { ScreenLayout } from "./ScreenLayout";
import { useSound } from "./SoundProvider";
import { useWorld } from "./WorldProvider";

const MODES = [
  { id: "quiz", label: "一問一答" },
  { id: "explain", label: "言語化" },
] as const;

type Mode = (typeof MODES)[number]["id"];

/** 1回のテスト。results が queue と同じ長さになったら終了。 */
type QuizRun = {
  readonly queue: readonly QuizCard[];
  readonly results: readonly boolean[];
  /** 今の問題の答え合わせ。id と時刻は再送しても変えない。 */
  readonly judged: (Judged & { id: string; answeredAt: string }) | null;
  /** 始める前のレベル。分からなければ null。 */
  readonly startLevel: number | null;
};

export function QuizScreen() {
  const { theme } = useWorld();
  const isWide = useWide();
  const [mode, setMode] = useState<Mode>("quiz");
  /** 一度でも言語化を開いたか。開くまでは、用語を読み込まない。 */
  const [hasOpenedExplain, setHasOpenedExplain] = useState(false);
  const [explainRank, setExplainRank] = useState<ExplanationRank | null>(null);
  const cards = useRemote(fetchCards);
  const history = useRemote(fetchAnswerLogs);
  const progress = useRemote(fetchProgress);
  /** URLの ?subject= で指定された科目。 */
  const requested = useSearchParams().get("subject");
  /** 画面で選び直した科目。URLの指定が変わったら無効になる。 */
  const [choice, setChoice] = useState<{
    requested: string | null;
    subject: string | null;
  } | null>(null);
  const [run, setRun] = useState<QuizRun | null>(null);
  const { play } = useSound();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 別の画面へ移ったら、終わったテストの結果は片付ける。
  useLayoutEffect(() => {
    return () => setRun((current) => (isFinished(current) ? null : current));
  }, []);

  const allCards = cards.data ?? [];
  const subjects = listSubjects(allCards);
  /** null なら全科目。 */
  const subject =
    choice !== null && choice.requested === requested
      ? choice.subject
      : requested;
  const isSubjectMissing =
    cards.data !== null && subject !== null && !subjects.includes(subject);
  const current = run === null ? undefined : run.queue[run.results.length];

  function startQuiz() {
    const queue = selectQuizCards(
      allCards,
      isSubjectMissing ? null : subject,
      Math.random,
    );
    if (queue.length === 0) return;
    setError(null);
    setRun({
      queue,
      results: [],
      judged: null,
      startLevel: progress.data && levelState(progress.data).level,
    });
  }

  function handleAnswer(input: string) {
    if (run === null || current === undefined) return;
    const answer = parseUserAnswer(input);
    if (!answer.ok) {
      setError(answer.error);
      return;
    }
    const isCorrect = judgeAnswer(answer.value, current.answer);
    play(isCorrect ? "correct" : "incorrect");
    setError(null);
    setRun({
      ...run,
      judged: {
        id: crypto.randomUUID(),
        userAnswer: answer.value,
        isAutoCorrect: isCorrect,
        isCorrect,
        // 「わからない」は知識不足を初期選択にする。
        mistakeReason: answer.value === "" ? "knowledge" : null,
        answeredAt: new Date().toISOString(),
      },
    });
  }

  function handleToggleCorrect() {
    if (run === null || run.judged === null) return;
    const { judged } = run;
    setRun({ ...run, judged: { ...judged, isCorrect: !judged.isCorrect } });
  }

  function handleReasonChange(mistakeReason: MistakeReason | null) {
    if (run === null || run.judged === null) return;
    setRun({ ...run, judged: { ...run.judged, mistakeReason } });
  }

  async function handleNext() {
    if (run === null || run.judged === null || current === undefined) return;
    const { id, userAnswer, isCorrect, mistakeReason, answeredAt } = run.judged;
    setIsSaving(true);
    setError(null);
    const result = await saveAnswerLog({
      id,
      cardId: current.id,
      userAnswer,
      isCorrect,
      mistakeReason: isCorrect ? null : mistakeReason,
      answeredAt,
    });
    setIsSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const results = [...run.results, isCorrect];
    setRun({ ...run, results, judged: null });
    if (results.length === run.queue.length) {
      await Promise.all([history.reload(), progress.reload()]);
    }
  }

  const moment = toMoment(run);
  const cheer = selectQuizCheer(
    theme.quiz.cheers,
    moment,
    run?.results.length ?? 0,
  );

  const isExplaining = mode === "explain";

  return (
    <ScreenLayout>
      <ScreenHeader title={theme.terms.navQuiz} subtitle="確認テスト" />
      {run === null && (
        <ModeTabs
          label="テストの種類"
          modes={MODES}
          current={mode}
          onChange={(next) => {
            setMode(next);
            if (next === "explain") setHasOpenedExplain(true);
          }}
        />
      )}
      {/* PC版では、左にキャラと演出、右に問題や結果を並べる。 */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(20rem,1fr)_minmax(0,1.4fr)] lg:items-start">
        <div className="flex flex-col gap-5 lg:sticky lg:top-6">
          {isWide && run === null && (
            <div className="panel overflow-hidden">
              <CharacterArt theme={theme} kind="scene" />
            </div>
          )}
          {isExplaining ? (
            <CharacterPanel
              theme={theme}
              mood={explainMood(explainRank)}
              lines={[selectExplainCheer(theme.quiz.explain, explainRank, 0)]}
            />
          ) : (
            <CharacterPanel
              theme={theme}
              mood={quizMood(moment)}
              lines={[cheer]}
            />
          )}
          {run !== null && current === undefined && (
            <LevelUpBanner
              theme={theme}
              totals={progress.data}
              previousLevel={run.startLevel}
              // 全問正解なら、結果の欄に絵が出る。
              hasArt={moment !== "perfect"}
            />
          )}

          {run !== null && (
            <QuizStage
              key={run.queue[0]?.id}
              theme={theme}
              score={{
                correct: scoreQuiz(answered(run)).correct,
                total: run.queue.length,
              }}
              combo={comboCount(answered(run))}
              isHit={run.judged?.isCorrect === true}
            />
          )}
        </div>
        {/* 切り替えても書きかけが消えないよう、隠すだけにする。 */}
        {hasOpenedExplain && (
          <div hidden={!isExplaining} className="flex flex-col gap-5">
            <ExplainBoard
              title={theme.quiz.explain.label}
              onRank={setExplainRank}
            />
          </div>
        )}
        <div hidden={isExplaining} className="flex flex-col gap-5">
          {run !== null && current !== undefined && (
            <QuizQuestion
              key={`${run.results.length}-${current.id}`}
              card={current}
              number={run.results.length + 1}
              total={run.queue.length}
              judged={run.judged}
              isSaving={isSaving}
              error={error}
              onAnswer={handleAnswer}
              onToggleCorrect={handleToggleCorrect}
              onReasonChange={handleReasonChange}
              onNext={() => void handleNext()}
            />
          )}

          {run !== null && current === undefined && (
            <QuizResult
              theme={theme}
              score={scoreQuiz(run.results)}
              onRetry={startQuiz}
              onFinish={() => setRun(null)}
            />
          )}

          {run !== null && current === undefined && (
            <LevelPanel theme={theme} remote={progress} />
          )}

          {run === null && (
            <section className={PANEL}>
              {cards.error !== null && (
                <div role="alert" className="flex flex-col items-start gap-2">
                  <p>{cards.error}</p>
                  <button
                    type="button"
                    onClick={() => void cards.reload()}
                    className="underline"
                  >
                    もう一度読み込む
                  </button>
                </div>
              )}
              {cards.data === null && cards.error === null && (
                <p>読み込んでいます…</p>
              )}
              {cards.data !== null && cards.data.length === 0 && (
                <p>
                  まだカードがありません。
                  <Link href="/cards" className="text-primary underline">
                    {theme.quiz.terms.addCard}
                  </Link>
                </p>
              )}
              {allCards.length > 0 && (
                <>
                  {isSubjectMissing && (
                    <p role="status" className="break-words">
                      「{subject}」のカードはまだありません。すべての科目から出題します。
                    </p>
                  )}
                  <label className="flex flex-col gap-1">
                    <span className="text-sm text-accent">出題する科目</span>
                    <select
                      value={isSubjectMissing ? "" : (subject ?? "")}
                      onChange={(event) =>
                        setChoice({
                          requested,
                          subject:
                            event.target.value === "" ? null : event.target.value,
                        })
                      }
                      className={TEXT_INPUT}
                    >
                      <option value="">すべて</option>
                      {subjects.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={startQuiz}
                    className={PRIMARY_BUTTON}
                  >
                    {theme.quiz.terms.start}（最大{MAX_QUIZ_QUESTIONS}問）
                  </button>
                </>
              )}
            </section>
          )}

          {(run === null || current === undefined) && (
            <AnswerHistory
              terms={theme.quiz.terms}
              logs={history.data}
              cards={cards.data}
              error={history.error}
              onReload={() => void history.reload()}
            />
          )}
        </div>
      </div>
    </ScreenLayout>
  );
}

function isFinished(run: QuizRun | null): boolean {
  return run !== null && run.results.length === run.queue.length;
}

/** 答え合わせ中の問題も含めた、これまでの正誤。 */
function answered(run: QuizRun): readonly boolean[] {
  return run.judged === null
    ? run.results
    : [...run.results, run.judged.isCorrect];
}

function toMoment(run: QuizRun | null): QuizMoment {
  if (run === null) return "setup";
  if (isFinished(run)) {
    return rankQuiz(scoreQuiz(run.results));
  }
  if (run.judged === null) return "start";
  return run.judged.isCorrect ? "correct" : "incorrect";
}
