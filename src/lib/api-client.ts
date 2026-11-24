import { getDeviceId } from "./device-id";

/** 画面から自前のAPIを呼ぶための共通処理。 */

const TIMEOUT_MS = 15_000;

export type ApiResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };

/** 一覧を取得し、すべての要素の形を確かめてから返す。 */
export async function getList<T>(
  endpoint: string,
  key: string,
  isItem: (value: unknown) => value is T,
): Promise<ApiResult<T[]>> {
  const result = await request(endpoint, { method: "GET" });
  if (!result.ok) return result;
  const items = readField(result.value, key);
  if (!Array.isArray(items) || !items.every(isItem)) {
    return { ok: false, error: "データを読み取れませんでした。" };
  }
  return { ok: true, value: items };
}

export async function postJson(
  endpoint: string,
  body: object,
): Promise<ApiResult<null>> {
  const result = await request(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return result.ok ? { ok: true, value: null } : result;
}

async function request(
  endpoint: string,
  init: {
    method: "GET" | "POST";
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
