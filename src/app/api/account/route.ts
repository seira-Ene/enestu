import { readDeviceId, serverError, success } from "@/lib/api-response";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { readSession } from "@/lib/supabase/session";

/** 端末に残っていて、引き継げる記録の件数。隠したカードは数えない。 */
type Claimable = {
  readonly studyLogs: number;
  readonly cards: number;
  readonly answers: number;
};

/** ログインの状態と、この端末から引き継げる記録の件数を返す。 */
export async function GET(request: Request): Promise<Response> {
  // ビルド時の事前生成はここで中断される。try の中に入れないこと。
  const deviceId = readDeviceId(request);

  const action = "アカウントの取得";
  try {
    const session = await readSession();
    if (session === null) return success({ account: null, claimable: null });

    return success({
      account: session.account,
      claimable: deviceId.ok ? await countRecords(deviceId.value) : null,
    });
  } catch (error) {
    return serverError(action, error);
  }
}

async function countRecords(deviceId: string): Promise<Claimable> {
  const db = createSupabaseAdminClient();
  const onlyCount = { count: "exact", head: true } as const;
  const [studyLogs, cards, answers] = await Promise.all([
    db.from("study_logs").select("id", onlyCount).eq("device_id", deviceId),
    db
      .from("quiz_cards")
      .select("id", onlyCount)
      .eq("device_id", deviceId)
      .is("archived_at", null),
    db.from("answer_logs").select("id", onlyCount).eq("device_id", deviceId),
  ]);
  const error = studyLogs.error ?? cards.error ?? answers.error;
  if (error) throw error;
  return {
    studyLogs: studyLogs.count ?? 0,
    cards: cards.count ?? 0,
    answers: answers.count ?? 0,
  };
}
