import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { requireEnv } from "./env";

/** ブラウザ用。publishable key を使うため、RLSの制約を受ける。 */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    requireEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    requireEnv(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  );
}
