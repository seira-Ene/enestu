import { forbidden, seeOther } from "@/lib/api-response";
import { readSameOrigin } from "@/lib/same-origin";
import { createSessionClient } from "@/lib/supabase/session";

/** Googleのログイン画面へ移る。先読みで動かないよう、POSTだけを受ける。 */
export async function POST(request: Request): Promise<Response> {
  const origin = readSameOrigin(request);
  if (origin === null) return forbidden();

  try {
    const client = await createSessionClient();
    const { data, error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
        // 端末を共有していても、どのアカウントかを毎回選べるようにする。
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) throw error;
    return seeOther(data.url);
  } catch (error) {
    console.error("ログインの開始に失敗", error);
    return seeOther("/?login=failed");
  }
}
