import { isMistakeReason, type AnswerLog, type QuizCard } from "./quiz";
import {
  fail,
  isTooFarInFuture,
  parseIsoUtc,
  parseSubject,
  parseText,
  parseUuid,
  type ParseResult,
} from "./validation";

export const MAX_QUESTION_LENGTH = 200;
export const MAX_ANSWER_LENGTH = 100;

/** 画面の入力欄の内容（IDを除くカード）を検証する。 */
export function parseCardDraft(
  body: unknown,
): ParseResult<Omit<QuizCard, "id">> {
  if (typeof body !== "object" || body === null) {
    return fail("送信内容の形式が正しくありません。");
  }
  const fields: Partial<Record<keyof QuizCard, unknown>> = body;

  const subject = parseSubject(fields.subject);
  if (!subject.ok) return subject;
  const question = parseText(fields.question, {
    label: "問題",
    max: MAX_QUESTION_LENGTH,
    multiline: true,
  });
  if (!question.ok) return question;
  const answer = parseText(fields.answer, {
    label: "答え",
    max: MAX_ANSWER_LENGTH,
  });
  if (!answer.ok) return answer;

  return {
    ok: true,
    value: {
      subject: subject.value,
      question: question.value,
      answer: answer.value,
    },
  };
}

export function parseQuizCardInput(body: unknown): ParseResult<QuizCard> {
  const draft = parseCardDraft(body);
  if (!draft.ok) return draft;
  const id = parseUuid(readId(body));
  if (!id.ok) return id;
  return { ok: true, value: { id: id.value, ...draft.value } };
}

/** 解答の入力欄の内容を検証する。「わからない」は空文字で表す。 */
export function parseUserAnswer(value: unknown): ParseResult<string> {
  return parseText(value, {
    label: "解答",
    max: MAX_ANSWER_LENGTH,
    allowEmpty: true,
  });
}

export function parseAnswerLogInput(
  body: unknown,
  now: Date,
): ParseResult<AnswerLog> {
  if (typeof body !== "object" || body === null) {
    return fail("送信内容の形式が正しくありません。");
  }
  const fields: Partial<Record<keyof AnswerLog, unknown>> = body;

  const id = parseUuid(fields.id);
  if (!id.ok) return id;
  const cardId = parseUuid(fields.cardId);
  if (!cardId.ok) return cardId;
  const userAnswer = parseUserAnswer(fields.userAnswer);
  if (!userAnswer.ok) return userAnswer;
  const { isCorrect } = fields;
  if (typeof isCorrect !== "boolean") {
    return fail("正誤の形式が正しくありません。");
  }
  if (isCorrect && userAnswer.value === "") {
    return fail("解答が空の問題は、正解にできません。");
  }
  // 省略は未分類として扱う。
  const mistakeReason = fields.mistakeReason ?? null;
  if (mistakeReason !== null && !isMistakeReason(mistakeReason)) {
    return fail("誤答原因の形式が正しくありません。");
  }
  if (isCorrect && mistakeReason !== null) {
    return fail("正解の問題に、誤答原因は付けられません。");
  }
  const answered = parseIsoUtc(fields.answeredAt);
  if (!answered.ok) return answered;
  if (isTooFarInFuture(answered.value, now)) {
    return fail("解答時刻が未来です。端末の時計を確認してください。");
  }

  return {
    ok: true,
    value: {
      id: id.value,
      cardId: cardId.value,
      userAnswer: userAnswer.value,
      isCorrect,
      mistakeReason,
      answeredAt: new Date(answered.value).toISOString(),
    },
  };
}

function readId(body: unknown): unknown {
  if (typeof body !== "object" || body === null) return undefined;
  const fields: Partial<Record<"id", unknown>> = body;
  return fields.id;
}
