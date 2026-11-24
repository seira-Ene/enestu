import type {
  CharacterMood,
  QuestLines,
  QuizCheers,
  ThemeCheers,
} from "@/themes/types";
import type { Quest } from "./weakness";

/** 待機中／計測中／記録完了。 */
export type StudyStatus = "idle" | "running" | "saved";

export type CheerContext = {
  /** セリフの選択に使う数。同じ値なら同じセリフになる。 */
  readonly seed: number;
  /** 今日の合計秒。取得できていなければ null。 */
  readonly totalSeconds: number | null;
};

/** 状態に応じて、キャラクターが話すセリフを返す。 */
export function selectCheers(
  cheers: ThemeCheers,
  status: StudyStatus,
  { seed, totalSeconds }: CheerContext,
): string[] {
  switch (status) {
    case "idle":
      return [pickLine(cheers.welcome, seed)];
    case "running":
      return [pickLine(cheers.timerStart, seed)];
    case "saved": {
      const minutes = Math.floor((totalSeconds ?? 0) / 60);
      const lines = [pickLine(cheers.timerStop, seed)];
      // 1分未満だと「0分も」になるため、合計のセリフは言わない。
      if (minutes >= 1) {
        lines.push(
          pickLine(cheers.dailyTotal, seed).replaceAll(
            "{minutes}",
            String(minutes),
          ),
        );
      }
      return lines;
    }
  }
}

/** 出題前／出題中／正解／不正解、または結果の3段階。 */
export type QuizMoment = keyof QuizCheers;

/** テストの場面に応じて、キャラクターが話すセリフを返す。 */
export function selectQuizCheer(
  cheers: QuizCheers,
  moment: QuizMoment,
  seed: number,
): string {
  return pickLine(cheers[moment], seed);
}

/** 学習の状態に応じた、キャラクターの表情。 */
export function studyMood(status: StudyStatus): CharacterMood {
  return status === "saved" ? "happy" : "normal";
}

/** テストの場面に応じた、キャラクターの表情。 */
export function quizMood(moment: QuizMoment): CharacterMood {
  switch (moment) {
    case "correct":
    case "perfect":
    case "good":
      return "happy";
    case "incorrect":
    case "retry":
      return "worried";
    case "setup":
    case "start":
      return "normal";
  }
}

/** 今日のクエストの案内文を返す。達成していれば、種類によらず達成の文。 */
export function selectQuestLine(
  lines: QuestLines,
  quest: Quest,
  isAchieved: boolean,
): string {
  if (isAchieved) return lines.achieved;
  switch (quest.kind) {
    case "weak":
    case "neglected":
      // 関数で置き換え、科目名の「$」などを特別扱いさせない。
      return lines[quest.kind].replaceAll("{subject}", () => quest.subject);
    case "starter":
    case "clear":
      return lines[quest.kind];
  }
}

function pickLine(
  lines: readonly [string, ...string[]],
  seed: number,
): string {
  const index = Math.abs(Math.trunc(seed)) % lines.length;
  return lines[index] ?? lines[0];
}
