/** 画面とAPIに付ける、セキュリティ用のHTTPヘッダー。 */
export type Header = { readonly key: string; readonly value: string };

/** Googleのログイン画面。フォームの送信先に要る。 */
const GOOGLE_ACCOUNTS = "https://accounts.google.com";

/**
 * supabaseUrl は、画面が直接つなぐSupabase（Realtimeと写真）。
 * Next.jsが画面に埋め込むスクリプトのため、スクリプトは「自分のサイトから」までに限る。
 */
export function securityHeaders(supabaseUrl: string | undefined): Header[] {
  const supabase = supabaseUrl === undefined ? null : originOf(supabaseUrl);
  const realtime =
    supabase === null ? null : supabase.replace(/^http/, "ws");
  const sources = (...items: (string | null)[]) =>
    items.filter((item) => item !== null).join(" ");

  const policy = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    `img-src ${sources("'self'", "data:", "blob:", supabase)}`,
    "font-src 'self' data:",
    `connect-src ${sources("'self'", supabase, realtime)}`,
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    // ログインのフォームは、Supabaseを経てGoogleへ移る。
    `form-action ${sources("'self'", supabase, GOOGLE_ACCOUNTS)}`,
    "frame-ancestors 'none'",
  ].join("; ");

  return [
    { key: "Content-Security-Policy", value: policy },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
}

function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}
