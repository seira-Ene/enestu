/** アプリと、まねたSupabase。どちらも手元だけで動き、本番にはつながない。 */
export const APP_URL = "http://localhost:3100";
export const FAKE_PORT = 54999;
export const FAKE_URL = `http://localhost:${FAKE_PORT}`;

/** ビルドと起動に渡す、本物ではない値。 */
export const FAKE_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: FAKE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_dummy",
  SUPABASE_SECRET_KEY: "sb_secret_dummy",
  // テスト用の暗号化の鍵（32バイト）。本番の鍵ではない。
  BYOK_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  // Gemini の代わりに、まねたサーバーへ送る。
  GEMINI_API_BASE_URL: FAKE_URL,
} as const;
