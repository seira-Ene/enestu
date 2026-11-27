import {
  CARD_INSTRUCTION,
  CARD_RESPONSE_SCHEMA,
  wrapMaterial,
  type AiCardRequest,
} from "@/domain/ai-cards";

/**
 * Gemini API（generateContent）を呼ぶ。サーバーの Route Handler からだけ使うこと。
 * 1回ずつで完結する呼び方にし、会話をGoogle側に保存させない。
 * 呼び方を替えるときは、この形（キーと資料を受け取り、文字列か失敗を返す）を保つ。
 * キーはURLに入れず、x-goog-api-key で渡す。キーと資料は、エラーにもログにも入れない。
 */

export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com";
/** Vercelの関数の待ち時間（60秒）より短くする。 */
const TIMEOUT_MS = 45_000;

export type GeminiFailure =
  | "invalid_key"
  | "quota"
  | "blocked"
  | "unavailable"
  | "timeout"
  | "bad_output";

export type GeminiResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly failure: GeminiFailure };

type Fetch = (input: string, init: RequestInit) => Promise<Response>;

export type GeminiOptions = {
  readonly model?: string;
  readonly baseUrl?: string;
  readonly fetch?: Fetch;
};

function settings(options: GeminiOptions) {
  return {
    model: options.model ?? process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL,
    baseUrl: (options.baseUrl ?? process.env.GEMINI_API_BASE_URL ?? DEFAULT_BASE_URL).replace(
      /\/$/,
      "",
    ),
    fetch: options.fetch ?? fetch,
  };
}

/** キーで、モデルの情報を読めるか確かめる（問題は作らない）。 */
export async function checkGeminiKey(
  key: string,
  options: GeminiOptions = {},
): Promise<GeminiResult<{ readonly model: string }>> {
  const { model, baseUrl, fetch: send } = settings(options);
  const response = await call(send, `${baseUrl}/v1beta/models/${encodeURIComponent(model)}`, {
    method: "GET",
    headers: { "x-goog-api-key": key },
  });
  if (!response.ok) return { ok: false, failure: response.failure };
  return { ok: true, value: { model } };
}

/** 資料から問題を作らせ、返事の文字列（JSON）を返す。 */
export async function generateGeminiCards(
  key: string,
  request: AiCardRequest,
  options: GeminiOptions = {},
): Promise<GeminiResult<string>> {
  const { model, baseUrl, fetch: send } = settings(options);
  const url = `${baseUrl}/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const body = (withSchema: boolean) => ({
    systemInstruction: { parts: [{ text: CARD_INSTRUCTION }] },
    contents: [
      {
        role: "user",
        parts: [
          { text: wrapMaterial(request.text) },
          ...request.images.map((image) => ({
            inlineData: { mimeType: image.mimeType, data: image.data },
          })),
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      ...(withSchema ? { responseJsonSchema: CARD_RESPONSE_SCHEMA } : {}),
      temperature: 0.3,
      maxOutputTokens: 4096,
    },
  });
  const init = (withSchema: boolean): RequestInit => ({
    method: "POST",
    headers: { "x-goog-api-key": key, "content-type": "application/json" },
    body: JSON.stringify(body(withSchema)),
  });

  let response = await call(send, url, init(true));
  // 返事の形の指定に対応していなければ、指定を外してもう一度だけ頼む（返事は後で確かめる）。
  if (!response.ok && response.isSchemaError) response = await call(send, url, init(false));
  if (!response.ok) return { ok: false, failure: response.failure };

  const text = readText(response.json);
  if (text === null) {
    return { ok: false, failure: isBlocked(response.json) ? "blocked" : "bad_output" };
  }
  return { ok: true, value: text };
}

type CallResult =
  | { readonly ok: true; readonly json: unknown }
  | { readonly ok: false; readonly failure: GeminiFailure; readonly isSchemaError: boolean };

async function call(send: Fetch, url: string, init: RequestInit): Promise<CallResult> {
  let response: Response;
  try {
    response = await send(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "TimeoutError";
    return { ok: false, failure: isTimeout ? "timeout" : "unavailable", isSchemaError: false };
  }
  let json: unknown = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }
  if (response.ok) return { ok: true, json };
  return {
    ok: false,
    failure: failureOf(response.status, errorMessage(json)),
    isSchemaError: response.status === 400 && /schema/i.test(errorMessage(json)),
  };
}

function failureOf(status: number, message: string): GeminiFailure {
  if (status === 401 || status === 403) return "invalid_key";
  if (status === 400 && /api key/i.test(message)) return "invalid_key";
  if (status === 429) return "quota";
  if (status === 400) return "bad_output";
  return "unavailable";
}

function errorMessage(json: unknown): string {
  if (typeof json !== "object" || json === null) return "";
  const { error }: Partial<Record<"error", unknown>> = json;
  if (typeof error !== "object" || error === null) return "";
  const { message }: Partial<Record<"message", unknown>> = error;
  return typeof message === "string" ? message : "";
}

/** 1つ目の候補の、文の部分をつなげて返す。 */
function readText(json: unknown): string | null {
  const candidate = field(field(json, "candidates"), 0);
  const parts = field(field(candidate, "content"), "parts");
  if (!Array.isArray(parts)) return null;
  const text = parts
    .map((part) => field(part, "text"))
    .filter((value): value is string => typeof value === "string")
    .join("");
  return text === "" ? null : text;
}

function isBlocked(json: unknown): boolean {
  const reason = field(field(json, "promptFeedback"), "blockReason");
  const finish = field(field(field(json, "candidates"), 0), "finishReason");
  return typeof reason === "string" || finish === "SAFETY" || finish === "PROHIBITED_CONTENT";
}

function field(value: unknown, key: string | number): unknown {
  if (typeof key === "number") return Array.isArray(value) ? value[key] : undefined;
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  return (value as Record<string, unknown>)[key];
}
