import { seeOther } from "@/lib/api-response";
import {
  clearLoginAttempts,
  createSessionClient,
  saveAccountMarker,
} from "@/lib/supabase/session";

/**
 * Googleから戻ったときの処理。
 * 始めたときと同じブラウザでなければ、合言葉のCookieがなく失敗する。
 */
export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  if (params.get("error") === "access_denied") {
    return seeOther("/account?login=cancelled");
  }
  const code = params.get("code");
  if (code === null) return seeOther("/account?login=failed");

  try {
    const client = await createSessionClient();
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (error) throw error;
    await saveAccountMarker(data.user.id);
    await clearLoginAttempts();
    return seeOther("/account?login=ok");
  } catch (error) {
    console.error("ログインの完了に失敗", error);
    return seeOther("/account?login=failed");
  }
}
