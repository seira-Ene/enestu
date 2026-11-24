import { parseUuid } from "@/domain/validation";

/**
 * 画面が「誰として使っているか」を知るためのCookie。利用者のIDだけを入れる。
 * 本人の証明には使わない。証明は、画面から読めないセッションのCookieで行う。
 * ログインが切れても残るので、黙って未ログインに戻ることを防げる。
 */
export const ACCOUNT_MARKER = "enestu_account";

/** undefined は、まだ読んでいない印。 */
let pageAccountId: string | null | undefined;

/**
 * この画面を開いたときの利用者ID。未ログインなら null。ブラウザでだけ呼び出すこと。
 * 別のタブでログインが変わっても、開いたときの値を保つ（食い違いはサーバーが止める）。
 */
export function getPageAccountId(): string | null {
  if (pageAccountId === undefined) {
    pageAccountId = parseAccountMarker(document.cookie);
  }
  return pageAccountId;
}

export function parseAccountMarker(cookie: string): string | null {
  for (const pair of cookie.split(";")) {
    const [name, value] = pair.trim().split("=", 2);
    if (name !== ACCOUNT_MARKER) continue;
    const id = parseUuid(value);
    return id.ok ? id.value : null;
  }
  return null;
}
