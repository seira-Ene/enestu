import { forbidden, seeOther } from "@/lib/api-response";
import { readSameOrigin } from "@/lib/same-origin";
import {
  clearSessionCookies,
  createSessionClient,
} from "@/lib/supabase/session";

/** この端末だけログアウトする。 */
export async function POST(request: Request): Promise<Response> {
  if (readSameOrigin(request) === null) return forbidden();

  try {
    const client = await createSessionClient();
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) throw error;
  } catch (error) {
    // 認証サーバーに伝えられなくても、この端末からは必ず消す。
    console.error("ログアウトの通知に失敗", error);
  }
  await clearSessionCookies();
  return seeOther("/");
}
