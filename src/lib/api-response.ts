import { ROW_LIMIT_MESSAGE } from "@/domain/limits";
import { parseUuid, type ParseResult } from "@/domain/validation";

/** Route Handler で共用する、リクエストの読み取りと応答の組み立て。 */

const NO_STORE = { "Cache-Control": "no-store" };

export function readDeviceId(request: Request): ParseResult<string> {
  return parseUuid(request.headers.get("x-device-id"));
}

/** JSONとして読めない本文は null にする（検証側で拒否される）。 */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/** 読めないフォームは null にする。 */
export async function readFormData(request: Request): Promise<FormData | null> {
  try {
    return await request.formData();
  } catch {
    return null;
  }
}

export function success(body: Record<string, unknown>): Response {
  return Response.json(body, { headers: NO_STORE });
}

export function created(): Response {
  return Response.json({ ok: true }, { status: 201, headers: NO_STORE });
}

export function badRequest(message: string): Response {
  return Response.json({ error: message }, { status: 400, headers: NO_STORE });
}

/** ログインが切れている。未ログインの記録として保存させない。 */
export function signedOut(): Response {
  return problem(
    401,
    "signed_out",
    "ログインが切れました。もう一度ログインしてください。",
  );
}

/** ログインした人だけが使える機能。 */
export function loginRequired(): Response {
  return problem(401, "login_required", "ログインすると使えます。");
}

/** 画面を開いた後に、ログインの状態が変わっている。 */
export function accountChanged(): Response {
  return problem(
    409,
    "account_changed",
    "ログインの状態が変わりました。画面を読み込み直してください。",
  );
}

/** 件数の上限に達した。 */
export function limitReached(message: string): Response {
  return problem(429, "limit", message);
}

/** DBのトリガーが、件数の上限で止めたか。 */
export function isRowLimit(error: { message?: string } | null): boolean {
  return error?.message === ROW_LIMIT_MESSAGE;
}

/** 他のサイトから送られたフォーム。 */
export function forbidden(): Response {
  return problem(403, "forbidden", "この操作は受け付けられません。");
}

/** 次に開く画面へ移る。POSTの後でも、GETで開く。 */
export function seeOther(location: string): Response {
  return new Response(null, {
    status: 303,
    headers: { ...NO_STORE, Location: location },
  });
}

function problem(status: number, code: string, error: string): Response {
  return Response.json({ error, code }, { status, headers: NO_STORE });
}

/** 原因はサーバーのログにだけ残し、利用者には詳細を見せない。 */
export function serverError(action: string, cause: unknown): Response {
  console.error(`${action}に失敗`, cause);
  return Response.json(
    { error: `${action}に失敗しました。時間をおいて試してください。` },
    { status: 500, headers: NO_STORE },
  );
}
