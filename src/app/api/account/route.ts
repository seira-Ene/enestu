import type { RecordCounts } from "@/domain/account";
import { readDeviceId, serverError, success } from "@/lib/api-response";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { readSession, type Session } from "@/lib/supabase/session";

/** ログインの状態と、この端末から引き継げる記録の件数・名前を返す。 */
export async function GET(request: Request): Promise<Response> {
  // ビルド時の事前生成はここで中断される。try の中に入れないこと。
  const deviceId = readDeviceId(request);

  const action = "アカウントの取得";
  try {
    const session = await readSession();
    if (session === null) {
      return success({ status: { account: null, claimable: null } });
    }
    return success({
      status: {
        account: session.account,
        claimable: deviceId.ok
          ? await findClaimable(session, deviceId.value)
          : null,
      },
    });
  } catch (error) {
    return serverError(action, error);
  }
}

async function findClaimable(
  session: Session,
  deviceId: string,
): Promise<RecordCounts> {
  const db = createSupabaseAdminClient();
  const onlyCount = { count: "exact", head: true } as const;
  const [studyLogs, cards, answers, device, mine] = await Promise.all([
    db.from("study_logs").select("id", onlyCount).eq("device_id", deviceId),
    db
      .from("quiz_cards")
      .select("id", onlyCount)
      .eq("device_id", deviceId)
      .is("archived_at", null),
    db.from("answer_logs").select("id", onlyCount).eq("device_id", deviceId),
    db.from("user_settings").select("hero_name").eq("device_id", deviceId),
    session.client
      .from("user_settings")
      .select("hero_name")
      .eq("user_id", session.account.id),
  ]);
  const error =
    studyLogs.error ??
    cards.error ??
    answers.error ??
    device.error ??
    mine.error;
  if (error) throw error;
  // アカウントに名前があれば、端末の名前は移らない。
  const hasName = (mine.data?.[0]?.hero_name ?? null) !== null;
  return {
    studyLogs: studyLogs.count ?? 0,
    cards: cards.count ?? 0,
    answers: answers.count ?? 0,
    heroName: hasName ? null : (device.data?.[0]?.hero_name ?? null),
  };
}
