import { getPageAccountId } from "./account-marker";
import { getDeviceId } from "./device-id";

/** 画面から自前のAPIを呼ぶための共通処理。 */

const TIMEOUT_MS = 15_000;
/** 写真は大きいので、遅い回線でも待つ。 */
const UPLOAD_TIMEOUT_MS = 60_000;

/** サーバーが、ログインの食い違いを見つけたときに window へ送る。 */
export const ACCOUNT_PROBLEM_EVENT = "enestu:account-problem";
const ACCOUNT_PROBLEMS: readonly unknown[] = ["signed_out", "account_changed"];

export type ApiResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };

/** 応答の1項目を取得し、形を確かめてから返す。 */
export async function getField<T>(
  endpoint: string,
  key: string,
  isValid: (value: unknown) => value is T,
): Promise<ApiResult<T>> {
  return pickField(await request(endpoint, { method: "GET" }), key, isValid);
}

/** 送信し、応答の1項目を、形を確かめてから返す。AIのように時間のかかるものは timeoutMs を延ばす。 */
export async function postForField<T>(
  endpoint: string,
  body: object,
  key: string,
  isValid: (value: unknown) => value is T,
  timeoutMs = TIMEOUT_MS,
): Promise<ApiResult<T>> {
  return pickField(await sendBody("POST", endpoint, body, timeoutMs), key, isValid);
}

function pickField<T>(
  result: ApiResult<unknown>,
  key: string,
  isValid: (value: unknown) => value is T,
): ApiResult<T> {
  if (!result.ok) return result;
  const value = readField(result.value, key);
  return isValid(value)
    ? { ok: true, value }
    : { ok: false, error: "データを読み取れませんでした。" };
}

/** 一覧を取得し、すべての要素の形を確かめてから返す。 */
export function getList<T>(
  endpoint: string,
  key: string,
  isItem: (value: unknown) => value is T,
): Promise<ApiResult<T[]>> {
  return getField(
    endpoint,
    key,
    (value): value is T[] => Array.isArray(value) && value.every(isItem),
  );
}

export function postJson(
  endpoint: string,
  body: object,
): Promise<ApiResult<null>> {
  return send("POST", endpoint, body);
}

/** 写真を含むフォームを送る。 */
export async function postForm(
  endpoint: string,
  form: FormData,
): Promise<ApiResult<null>> {
  const result = await request(
    endpoint,
    { method: "POST", body: form },
    UPLOAD_TIMEOUT_MS,
  );
  return result.ok ? { ok: true, value: null } : result;
}

export function patchJson(
  endpoint: string,
  body: object,
): Promise<ApiResult<null>> {
  return send("PATCH", endpoint, body);
}

export function deleteResource(endpoint: string): Promise<ApiResult<null>> {
  return send("DELETE", endpoint, {});
}

async function send(
  method: "POST" | "PATCH" | "DELETE",
  endpoint: string,
  body: object,
): Promise<ApiResult<null>> {
  const result = await sendBody(method, endpoint, body);
  return result.ok ? { ok: true, value: null } : result;
}

function sendBody(
  method: "POST" | "PATCH" | "DELETE",
  endpoint: string,
  body: object,
  timeoutMs = TIMEOUT_MS,
): Promise<ApiResult<unknown>> {
  return request(
    endpoint,
    {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    timeoutMs,
  );
}

async function request(
  endpoint: string,
  init: {
    method: "GET" | "POST" | "PATCH" | "DELETE";
    headers?: Record<string, string>;
    body?: string | FormData;
  },
  timeoutMs = TIMEOUT_MS,
): Promise<ApiResult<unknown>> {
  try {
    const response = await fetch(endpoint, {
      ...init,
      headers: { ...init.headers, ...ownerHeaders() },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body: unknown = await response.json();
    if (response.ok) return { ok: true, value: body };
    if (ACCOUNT_PROBLEMS.includes(readField(body, "code"))) {
      window.dispatchEvent(new Event(ACCOUNT_PROBLEM_EVENT));
    }
    const message = readField(body, "error");
    return {
      ok: false,
      error:
        typeof message === "string" ? message : "サーバーで問題が起きました。",
    };
  } catch {
    return {
      ok: false,
      error: "通信できませんでした。接続を確認してください。",
    };
  }
}

/** 誰の記録として扱ってほしいか。実際のログインと違えば、サーバーが止める。 */
function ownerHeaders(): Record<string, string> {
  const accountId = getPageAccountId();
  return {
    "x-device-id": getDeviceId(),
    ...(accountId !== null && { "x-account-id": accountId }),
  };
}

function readField(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null) return undefined;
  return new Map<string, unknown>(Object.entries(value)).get(key);
}
