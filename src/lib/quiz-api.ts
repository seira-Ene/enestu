import { isMistakeReason, type AnswerLog, type QuizCard } from "@/domain/quiz";
import {
  deleteResource,
  getList,
  patchJson,
  postJson,
  type ApiResult,
} from "./api-client";

const CARDS_ENDPOINT = "/api/cards";
const ANSWER_LOGS_ENDPOINT = "/api/answer-logs";

export function fetchCards(): Promise<ApiResult<QuizCard[]>> {
  return getList(CARDS_ENDPOINT, "cards", isQuizCard);
}

export function saveCard(card: QuizCard): Promise<ApiResult<null>> {
  return postJson(CARDS_ENDPOINT, card);
}

export function saveCards(
  cards: readonly QuizCard[],
): Promise<ApiResult<null>> {
  return postJson(`${CARDS_ENDPOINT}/bulk`, { cards });
}

export function updateCard(
  id: string,
  draft: Omit<QuizCard, "id">,
): Promise<ApiResult<null>> {
  return patchJson(`${CARDS_ENDPOINT}/${encodeURIComponent(id)}`, draft);
}

export function deleteCard(id: string): Promise<ApiResult<null>> {
  return deleteResource(`${CARDS_ENDPOINT}/${encodeURIComponent(id)}`);
}

export function fetchAnswerLogs(): Promise<ApiResult<AnswerLog[]>> {
  return getList(ANSWER_LOGS_ENDPOINT, "logs", isAnswerLog);
}

export function saveAnswerLog(log: AnswerLog): Promise<ApiResult<null>> {
  return postJson(ANSWER_LOGS_ENDPOINT, log);
}

function isQuizCard(value: unknown): value is QuizCard {
  if (typeof value !== "object" || value === null) return false;
  const fields: Partial<Record<keyof QuizCard, unknown>> = value;
  return (
    typeof fields.id === "string" &&
    typeof fields.subject === "string" &&
    typeof fields.question === "string" &&
    typeof fields.answer === "string"
  );
}

function isAnswerLog(value: unknown): value is AnswerLog {
  if (typeof value !== "object" || value === null) return false;
  const fields: Partial<Record<keyof AnswerLog, unknown>> = value;
  return (
    typeof fields.id === "string" &&
    typeof fields.cardId === "string" &&
    typeof fields.userAnswer === "string" &&
    typeof fields.isCorrect === "boolean" &&
    (fields.mistakeReason === null || isMistakeReason(fields.mistakeReason)) &&
    typeof fields.answeredAt === "string"
  );
}
