import "server-only";
import { decideOwner } from "@/domain/account";
import {
  accountChanged,
  badRequest,
  serverError,
  signedOut,
} from "./api-response";
import { createSupabaseAdminClient } from "./supabase/server";
import {
  readSession,
  saveAccountMarker,
  type SessionClient,
} from "./supabase/session";

/** 記録の持ち主。読み取りと変更は、必ず column と id で絞り込む。 */
export type Owner =
  | {
      readonly kind: "device";
      readonly column: "device_id";
      readonly id: string;
      /** 追加する行に入れる、持ち主の列。 */
      readonly columns: { readonly device_id: string };
      /** RLSを迂回するため、絞り込みを忘れると他人の記録に触れる。 */
      readonly db: ReturnType<typeof createSupabaseAdminClient>;
    }
  | {
      readonly kind: "user";
      readonly column: "user_id";
      readonly id: string;
      readonly columns: { readonly user_id: string };
      /** 本人のトークンで接続する。RLSも効く。 */
      readonly db: SessionClient;
    };

export type OwnerResult =
  | { readonly ok: true; readonly value: Owner }
  | { readonly ok: false; readonly response: Response };

/** リクエストの持ち主を決める。決められなければ、返すべき応答を渡す。 */
export async function resolveOwner(request: Request): Promise<OwnerResult> {
  // ビルド時の事前生成はここで中断される。try の中に入れないこと。
  const accountId = request.headers.get("x-account-id");
  const deviceId = request.headers.get("x-device-id");
  try {
    const session = await readSession();
    const decision = decideOwner({
      accountId,
      deviceId,
      sessionUserId: session?.account.id ?? null,
    });
    if (decision.kind === "invalid") return reject(badRequest(decision.error));
    if (decision.kind === "device") {
      return accept({
        kind: "device",
        column: "device_id",
        id: decision.id,
        columns: { device_id: decision.id },
        db: createSupabaseAdminClient(),
      });
    }
    if (decision.kind === "signed_out" || session === null) {
      return reject(signedOut());
    }
    if (decision.kind === "account_changed") {
      // 読み込み直せば直るように、画面用の印を実際のログインに合わせる。
      await saveAccountMarker(session.account.id);
      return reject(accountChanged());
    }
    return accept({
      kind: "user",
      column: "user_id",
      id: decision.id,
      columns: { user_id: decision.id },
      db: session.client,
    });
  } catch (error) {
    return reject(serverError("ログインの確認", error));
  }
}

function accept(value: Owner): OwnerResult {
  return { ok: true, value };
}

function reject(response: Response): OwnerResult {
  return { ok: false, response };
}
