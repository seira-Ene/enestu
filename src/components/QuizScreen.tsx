"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLayoutEffect, useState } from "react";
import { judgeAnswer } from "@/domain/answer-judge";
import { selectQuizCheer, type QuizMoment } from "@/domain/cheer";
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
import { fetchAnswerLogs, fetchCards, saveAnswerLog } from "@/lib/quiz-api";
import { useRemote } from "@/lib/use-remote";
import type { WorldTheme } from "@/themes/types";
import { AnswerHistory } from "./AnswerHistory";
import { CharacterPanel } from "./CharacterPanel";
import { PANEL, PRIMARY_BUTTON, TEXT_INPUT } from "./form-styles";
import { QuizQuestion, type Judged } from "./QuizQuestion";
import { QuizResult } from "./QuizResult";
import { QuizStage } from "./QuizStage";

/** 1回のテスト。results が queue と同じ長さになったら終了。 */
type QuizRun = {
  readonly queue: readonly QuizCard[];
  readonly results: readonly boolean[];
  /** 今の問題の答え合わせ。id と時刻は再送しても変えない。 */
  readonly judged: (Judged & { id: string; answeredAt: string }) | null;
};

export function QuizScreen({ theme }: { theme: WorldTheme }) {
  const cards = useRemote(fetchCards);
  const history = useRemote(fetchAnswerLogs);
  /** URLの ?subject= で指定された科目。 */
  const requested = useSearchParams().get("subject");
  /** 画面で選び直した科目。URLの指定が変わったら無効になる。 */
  const [choice, setChoice] = useState<{
    requested: string | null;
    subject: string | null;
  } | null>(null);
  const [run, setRun] = useState<QuizRun | null>(null);
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
    setRun({ queue, results: [], judged: null });
  }

  function handleAnswer(input: string) {
    if (run === null || current === undefined) return;
    const answer = parseUserAnswer(input);
    if (!answer.ok) {
      setError(answer.error);
      return;
    }
    const isCorrect = judgeAnswer(answer.value, current.answer);
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
    if (results.length === run.queue.length) await history.reload();
  }

  const moment = toMoment(run);
  const cheer = selectQuizCheer(
    theme.quiz.cheers,
    moment,
    run?.results.length ?? 0,
  );

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-primary">
          {theme.terms.navQuiz}
        </h1>
        <p className="text-sm text-accent">確認テスト</p>
      </header>
      <CharacterPanel character={theme.character} lines={[cheer]} />

      {run !== null && (
        <QuizStage
          key={run.queue[0]?.id}
          stage={theme.quiz.stage}
          score={{ correct: countCorrect(run), total: run.queue.length }}
          isHit={run.judged?.isCorrect === true}
        />
      )}

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
          terms={theme.quiz.terms}
          score={scoreQuiz(run.results)}
          onRetry={startQuiz}
          onFinish={() => setRun(null)}
        />
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
          cards={allCards}
          error={history.error}
          onReload={() => void history.reload()}
        />
      )}
    </main>
  );
}

function isFinished(run: QuizRun | null): boolean {
  return run !== null && run.results.length === run.queue.length;
}

function countCorrect(run: QuizRun): number {
  const { correct } = scoreQuiz(run.results);
  return run.judged?.isCorrect ? correct + 1 : correct;
}

function toMoment(run: QuizRun | null): QuizMoment {
  if (run === null) return "setup";
  if (isFinished(run)) {
    return rankQuiz(scoreQuiz(run.results));
  }
  if (run.judged === null) return "start";
  return run.judged.isCorrect ? "correct" : "incorrect";
}
