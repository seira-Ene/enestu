import type {
  ExplainTerm,
  ExplanationLog,
  SubjectAverage,
} from "@/domain/explanation";
import type { ExplanationInput, TermDraft } from "@/domain/explanation-input";
import {
  deleteResource,
  getList,
  patchJson,
  postForField,
  postJson,
  type ApiResult,
} from "./api-client";

const TERMS_ENDPOINT = "/api/terms";
const EXPLANATIONS_ENDPOINT = "/api/explanations";

export function fetchTerms(): Promise<ApiResult<ExplainTerm[]>> {
  return getList(TERMS_ENDPOINT, "terms", isExplainTerm);
}

export function saveTerm(term: ExplainTerm): Promise<ApiResult<null>> {
  return postJson(TERMS_ENDPOINT, term);
}

export function updateTerm(
  id: string,
  draft: TermDraft,
): Promise<ApiResult<null>> {
  return patchJson(`${TERMS_ENDPOINT}/${encodeURIComponent(id)}`, draft);
}

export function deleteTerm(id: string): Promise<ApiResult<null>> {
  return deleteResource(`${TERMS_ENDPOINT}/${encodeURIComponent(id)}`);
}

export function fetchExplanations(): Promise<ApiResult<ExplanationLog[]>> {
  return getList(EXPLANATIONS_ENDPOINT, "logs", isExplanationLog);
}

/** 説明を送り、判定の結果を受け取る。 */
export function submitExplanation(
  input: ExplanationInput,
): Promise<ApiResult<ExplanationLog>> {
  return postForField(EXPLANATIONS_ENDPOINT, input, "log", isExplanationLog);
}

export function fetchExplanationStats(): Promise<ApiResult<SubjectAverage[]>> {
  return getList("/api/explanation-stats", "averages", isSubjectAverage);
}

function isExplainTerm(value: unknown): value is ExplainTerm {
  if (typeof value !== "object" || value === null) return false;
  const fields: Partial<Record<keyof ExplainTerm, unknown>> = value;
  return (
    typeof fields.id === "string" &&
    typeof fields.subject === "string" &&
    typeof fields.term === "string" &&
    isTextList(fields.keywords)
  );
}

function isExplanationLog(value: unknown): value is ExplanationLog {
  if (typeof value !== "object" || value === null) return false;
  const fields: Partial<Record<keyof ExplanationLog, unknown>> = value;
  return (
    typeof fields.id === "string" &&
    typeof fields.termId === "string" &&
    typeof fields.body === "string" &&
    typeof fields.totalCount === "number" &&
    isTextList(fields.missing) &&
    typeof fields.explainedAt === "string"
  );
}

function isSubjectAverage(value: unknown): value is SubjectAverage {
  if (typeof value !== "object" || value === null) return false;
  const fields: Partial<Record<keyof SubjectAverage, unknown>> = value;
  return (
    typeof fields.subject === "string" &&
    typeof fields.count === "number" &&
    typeof fields.percent === "number"
  );
}

function isTextList(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}
