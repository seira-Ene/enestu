import "server-only";
import { AI_DAILY_LIMIT } from "@/domain/ai-key";
import { aiProblem, isRowLimit } from "./api-response";
import type { Owner } from "./owner";
import { openSecret } from "./secret-box";
import { createSupabaseAdminClient } from "./supabase/server";
import { requireEnv } from "./supabase/env";

/**
 * AIを呼ぶ前の準備。保存したキーを戻し、1日の回数を1つ数える。
 * 暗号文は、本人のトークンでは読めないため secret key で読む（AGENTS.md の決まり）。
 * キーはこの関数の外へは、AIを呼ぶためだけに渡す。応答やログには出さない。
 */
export async function prepareAiCall(
  owner: Extract<Owner, { kind: "user" }>,
  kind: "cards" | "quest" | "check",
): Promise<{ ok: true; key: string } | { ok: false; response: Response }> {
  const { data, error } = await createSupabaseAdminClient()
    .from("ai_keys")
    .select("ciphertext")
    .eq("user_id", owner.id);
  if (error) throw new Error("AIのキーを読めない");
  const sealed = data[0]?.ciphertext;
  if (sealed === undefined) {
    return reject(409, "no_ai_key", "AIのキーを、アカウントの画面で登録してください。");
  }
  const key = openSecret(
    sealed,
    requireEnv("BYOK_ENCRYPTION_KEY", process.env.BYOK_ENCRYPTION_KEY),
  );
  if (key === null) {
    return reject(
      409,
      "ai_key_unreadable",
      "保存したキーを読み取れませんでした。アカウントの画面で、キーを登録し直してください。",
    );
  }

  // 失敗しても1回と数える。連打を防ぐため、AIを呼ぶ前に数える。
  const recorded = await owner.db
    .from("ai_requests")
    .insert({ user_id: owner.id, kind });
  if (isRowLimit(recorded.error)) {
    return reject(
      429,
      "limit",
      `AIは1日${AI_DAILY_LIMIT}回までです。時間をおいてから試してください。`,
    );
  }
  if (recorded.error) throw new Error("AIの回数を数えられない");
  return { ok: true, key };
}

function reject(status: number, code: string, message: string) {
  return { ok: false as const, response: aiProblem(status, code, message) };
}
