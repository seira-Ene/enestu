/** 即時同期の状態：つなぎ始め／同期中／つなぎ直し中／端末がオフライン。 */
export type LiveStatus = "connecting" | "live" | "reconnecting" | "offline";

/** 失敗が続くほど間を空ける。 */
const RETRY_DELAYS_MS = [1_000, 2_000, 5_000, 10_000, 30_000] as const;

/** サーバーは、残り90秒を切ると新しい鍵を渡す。それより後に取り直す。 */
const TOKEN_MARGIN_MS = 75_000;

/** 続けて失敗した回数（1から）に応じた、次に試すまでの時間。 */
export function retryDelayMs(failures: number): number {
  const index = Math.min(Math.max(failures, 1), RETRY_DELAYS_MS.length) - 1;
  return RETRY_DELAYS_MS[index] ?? RETRY_DELAYS_MS[0];
}

/** 鍵の期限（ミリ秒）。読み取れなければ null。署名はサーバーが確かめる。 */
export function tokenExpiresAt(token: string): number | null {
  const payload = token.split(".")[1];
  if (payload === undefined) return null;
  try {
    const json = atob(payload.replaceAll("-", "+").replaceAll("_", "/"));
    const claims: unknown = JSON.parse(json);
    if (typeof claims !== "object" || claims === null) return null;
    const { exp }: { exp?: unknown } = claims;
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}

export function needsNewToken(token: string | null, now: Date): boolean {
  if (token === null) return true;
  const expiresAt = tokenExpiresAt(token);
  return expiresAt === null || expiresAt - now.getTime() < TOKEN_MARGIN_MS;
}
