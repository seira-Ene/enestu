import { getDeviceId } from "./device-id";

/** 画面から自前のAPIを呼ぶための共通処理。 */

const TIMEOUT_MS = 15_000;

export type ApiResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };

/** 応答の1項目を取得し、形を確かめてから返す。 */
export async function getField<T>(
  endpoint: string,
  key: string,
  isValid: (value: unknown) => value is T,
): Promise<ApiResult<T>> {
  const result = await request(endpoint, { method: "GET" });
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
  const result = await request(endpoint, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return result.ok ? { ok: true, value: null } : result;
}

async function request(
  endpoint: string,
  init: {
    method: "GET" | "POST" | "PATCH" | "DELETE";
    headers?: Record<string, string>;
    body?: string;
  },
): Promise<ApiResult<unknown>> {
  try {
    const response = await fetch(endpoint, {
      ...init,
      headers: { ...init.headers, "x-device-id": getDeviceId() },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body: unknown = await response.json();
    if (response.ok) return { ok: true, value: body };
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

function readField(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null) return undefined;
  return new Map<string, unknown>(Object.entries(value)).get(key);
}
