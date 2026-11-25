import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";

const HEARTBEAT_MS = 15_000;

/**
 * ブラウザ用。Realtimeの合図を受け取るためだけに使う。
 * 記録の読み書きは、必ず自前のAPIを通すこと。
 */
export function createRealtimeClient(getToken: () => Promise<string | null>) {
  return createClient(
    requireEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    requireEnv(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
    {
      accessToken: getToken,
      realtime: { heartbeatIntervalMs: HEARTBEAT_MS },
    },
  );
}
