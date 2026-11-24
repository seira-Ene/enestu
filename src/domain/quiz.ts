export type QuizCard = {
  readonly id: string;
  readonly subject: string;
  readonly question: string;
  readonly answer: string;
};

/** 誤答原因：知識不足／理解不足／ケアレス。 */
export const MISTAKE_REASONS = [
  "knowledge",
  "understanding",
  "careless",
] as const;

export type MistakeReason = (typeof MISTAKE_REASONS)[number];

export function isMistakeReason(value: unknown): value is MistakeReason {
  return MISTAKE_REASONS.some((reason) => reason === value);
}

export type AnswerLog = {
  readonly id: string;
  readonly cardId: string;
  readonly userAnswer: string;
  readonly isCorrect: boolean;
  /** 正解、または原因を選ばなかった（未分類）なら null。 */
  readonly mistakeReason: MistakeReason | null;
  readonly answeredAt: string;
};

export type QuizScore = { readonly correct: number; readonly total: number };

/** 全問正解／あと少し／もう一度。 */
export type QuizRank = "perfect" | "good" | "retry";

export const MAX_QUIZ_QUESTIONS = 10;

const GOOD_RATE = 0.6;

/**
 * 出題するカードを選び、順番を混ぜる。
 * subject が null なら全科目から選ぶ。random は0以上1未満を返す関数。
 */
export function selectQuizCards(
  cards: readonly QuizCard[],
  subject: string | null,
  random: () => number,
  limit: number = MAX_QUIZ_QUESTIONS,
): QuizCard[] {
  const pool = cards.filter(
    (card) => subject === null || card.subject === subject,
  );
  // 残りから1枚ずつ引く。どの並び順も同じ確率になる。
  const picked: QuizCard[] = [];
  while (pool.length > 0 && picked.length < limit) {
    const index = Math.floor(random() * pool.length);
    picked.push(...pool.splice(index, 1));
  }
  return picked;
}

/** 重複を除いた科目名を、最初に現れた順で返す。 */
export function listSubjects(
  items: readonly { readonly subject: string }[],
): string[] {
  return [...new Set(items.map((item) => item.subject))];
}

export function scoreQuiz(results: readonly boolean[]): QuizScore {
  return {
    correct: results.filter((isCorrect) => isCorrect).length,
    total: results.length,
  };
}

export function rankQuiz({ correct, total }: QuizScore): QuizRank {
  if (total <= 0) return "retry";
  if (correct >= total) return "perfect";
  return correct / total >= GOOD_RATE ? "good" : "retry";
}

/** 正解の割合を0〜100の整数で返す。全問正解のときだけ100になる。 */
export function correctPercent({ correct, total }: QuizScore): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.floor((correct / total) * 100)));
}
