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

export function success(body: Record<string, unknown>): Response {
  return Response.json(body, { headers: NO_STORE });
}

export function created(): Response {
  return Response.json({ ok: true }, { status: 201, headers: NO_STORE });
}

export function badRequest(message: string): Response {
  return Response.json({ error: message }, { status: 400, headers: NO_STORE });
}

/** 原因はサーバーのログにだけ残し、利用者には詳細を見せない。 */
export function serverError(action: string, cause: unknown): Response {
  console.error(`${action}に失敗`, cause);
  return Response.json(
    { error: `${action}に失敗しました。時間をおいて試してください。` },
    { status: 500, headers: NO_STORE },
  );
}
