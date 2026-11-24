import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { requireEnv } from "./env";

/**
 * Route Handler 専用。secret key はRLSを迂回するため、
 * 呼び出し側で入力検証と端末IDによる絞り込みを必ず行う。
 */
export function createSupabaseAdminClient() {
  return createClient<Database>(
    requireEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    requireEnv("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
