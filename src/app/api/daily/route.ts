import { isDailyKind, parseDailyClaimRequest } from "@/domain/daily";
import {
  alreadyClaimed,
  badRequest,
  notAchieved,
  readJson,
  serverError,
  success,
} from "@/lib/api-response";
import { resolveOwner, type Owner } from "@/lib/owner";

/** 今日の進み具合と、訪問の記録を返す。 */
export async function GET(request: Request): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;

  const action = "今日の記録の読み込み";
  try {
    const { data, error } = await readStatus(owner.value);
    if (error) return serverError(action, error);
    const row = data[0];
    if (row === undefined) return serverError(action, "行がない");
    return success({
      daily: {
        day: row.day,
        claimed: row.claimed.filter(isDailyKind),
        studySeconds: row.study_seconds,
        answers: row.answers,
        explanations: row.explanations,
        streak: row.streak,
        lastVisit: row.last_visit,
      },
    });
  } catch (error) {
    return serverError(action, error);
  }
}

/** ログインボーナスかミッションの報酬を受け取る。条件と報酬はDBの関数が決める。 */
export async function POST(request: Request): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;

  const input = parseDailyClaimRequest(await readJson(request));
  if (!input.ok) return badRequest(input.error);

  const action = "受け取り";
  try {
    const { kind, world } = input.value;
    const { data, error } =
      owner.value.kind === "user"
        ? await owner.value.db.rpc("my_daily_claim", {
            p_kind: kind,
            p_world_id: world,
          })
        : await owner.value.db.rpc("daily_claim", {
            p_device_id: owner.value.id,
            p_kind: kind,
            p_world_id: world,
          });
    if (error?.message === "already_claimed") return alreadyClaimed();
    if (error?.message === "not_achieved") return notAchieved();
    if (error) return serverError(action, error);
    const row = data[0];
    if (row === undefined) return serverError(action, "行がない");
    return success({
      claim: {
        kind,
        tickets: row.tickets,
        itemId: row.item_id,
        streak: row.streak,
      },
    });
  } catch (error) {
    return serverError(action, error);
  }
}

function readStatus(owner: Owner) {
  return owner.kind === "user"
    ? owner.db.rpc("my_daily_status")
    : owner.db.rpc("daily_status", { p_device_id: owner.id });
}
