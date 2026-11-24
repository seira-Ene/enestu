/**
 * 自分のサイトの画面から送られたフォームなら、その起点を返す。違えば null。
 * 他のサイトが、利用者に気づかれずにログインやログアウトをさせるのを防ぐ。
 */
export function readSameOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin === null || host === null) return null;
  try {
    const url = new URL(origin);
    return url.host === host ? url.origin : null;
  } catch {
    return null;
  }
}
