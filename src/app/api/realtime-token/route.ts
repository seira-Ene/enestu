import {
  loginRequired,
  serverError,
  signedOut,
  success,
} from "@/lib/api-response";
import { resolveOwner } from "@/lib/owner";

/**
 * Realtimeの合図を受け取るための、期限の短い鍵を本人に渡す。
 * 画面は保存せず、メモリにだけ置くこと。更新用の鍵は渡さない。
 */
export async function GET(request: Request): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;
  if (owner.value.kind !== "user") return loginRequired();

  try {
    // 署名は resolveOwner で確かめてある。
    const { data, error } = await owner.value.db.auth.getSession();
    if (error) return serverError("同期の準備", error);
    if (data.session === null) return signedOut();
    return success({ token: data.session.access_token });
  } catch (error) {
    return serverError("同期の準備", error);
  }
}
