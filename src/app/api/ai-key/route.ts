import { keyLast4, parseAiKeyInput, type AiKeySummary } from "@/domain/ai-key";
import {
  badRequest,
  loginRequired,
  readJson,
  serverError,
  success,
} from "@/lib/api-response";
import { resolveOwner, type Owner } from "@/lib/owner";
import { sealSecret } from "@/lib/secret-box";
import { requireEnv } from "@/lib/supabase/env";

/**
 * 利用者のAIのAPIキー（BYOK）。ログインした人だけが使える。
 * キーはここで暗号化してから保存し、応答には末尾4文字だけを返す。キーはログにも出さない。
 */

type UserOwner = Extract<Owner, { kind: "user" }>;

export async function GET(request: Request): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;
  if (owner.value.kind !== "user") return loginRequired();

  const action = "AIの設定の読み込み";
  try {
    const result = await readSummary(owner.value);
    return result.ok ? success({ aiKey: result.value }) : serverError(action, result.error);
  } catch (error) {
    return serverError(action, error);
  }
}

export async function POST(request: Request): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;
  if (owner.value.kind !== "user") return loginRequired();

  const input = parseAiKeyInput(await readJson(request));
  if (!input.ok) return badRequest(input.error);

  const action = "AIのキーの保存";
  try {
    const { db, id } = owner.value;
    const values = {
      provider: input.value.provider,
      ciphertext: sealSecret(
        input.value.key,
        requireEnv("BYOK_ENCRYPTION_KEY", process.env.BYOK_ENCRYPTION_KEY),
      ),
      last4: keyLast4(input.value.key),
      updated_at: new Date().toISOString(),
    };
    // 本人は user_id を書き換えられないため、まず書き換え、なければ足す。
    const updated = await db
      .from("ai_keys")
      .update(values)
      .eq("user_id", id)
      .select("user_id");
    if (updated.error) return serverError(action, "更新できない");
    if (updated.data.length === 0) {
      const inserted = await db.from("ai_keys").insert({ user_id: id, ...values });
      // DBのエラーには暗号文が含まれることがあるため、中身は残さない。
      if (inserted.error) return serverError(action, "追加できない");
    }
    const result = await readSummary(owner.value);
    return result.ok ? success({ aiKey: result.value }) : serverError(action, result.error);
  } catch {
    return serverError(action, "暗号化か保存に失敗");
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;
  if (owner.value.kind !== "user") return loginRequired();

  const action = "AIのキーの削除";
  try {
    const { error } = await owner.value.db
      .from("ai_keys")
      .delete()
      .eq("user_id", owner.value.id);
    return error ? serverError(action, error) : success({ aiKey: null });
  } catch (error) {
    return serverError(action, error);
  }
}

async function readSummary(
  owner: UserOwner,
): Promise<
  { ok: true; value: AiKeySummary | null } | { ok: false; error: unknown }
> {
  const { data, error } = await owner.db
    .from("ai_keys")
    .select("provider, last4, updated_at")
    .eq("user_id", owner.id);
  if (error) return { ok: false, error };
  const row = data[0];
  if (row === undefined || row.provider !== "gemini") return { ok: true, value: null };
  return {
    ok: true,
    value: { provider: row.provider, last4: row.last4, updatedAt: row.updated_at },
  };
}
