import { gachaLimitMessage, parsePullRequest } from "@/domain/gacha";
import {
  badRequest,
  isRowLimit,
  limitReached,
  notEnoughTickets,
  readJson,
  serverError,
  success,
} from "@/lib/api-response";
import { resolveOwner, type Owner } from "@/lib/owner";

/** 券の状態と、持っている景品を返す。 */
export async function GET(request: Request): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;

  const action = "ガチャの読み込み";
  try {
    const [status, collection] = await Promise.all([
      readStatus(owner.value),
      readCollection(owner.value),
    ]);
    if (status.error) return serverError(action, status.error);
    if (collection.error) return serverError(action, collection.error);

    const row = status.data[0];
    return success({
      gacha: {
        status: {
          earned: row?.earned ?? 0,
          spent: row?.spent ?? 0,
          sinceTop: row?.since_top ?? 0,
        },
        collection: collection.data.map((item) => ({
          itemId: item.item_id,
          copies: item.copies,
        })),
      },
    });
  } catch (error) {
    return serverError(action, error);
  }
}

/** 券を使って引く。くじはDBの関数が引き、記録する。 */
export async function POST(request: Request): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;

  const input = parsePullRequest(await readJson(request));
  if (!input.ok) return badRequest(input.error);

  const action = "ガチャ";
  try {
    const { world, count } = input.value;
    const { data, error } =
      owner.value.kind === "user"
        ? await owner.value.db.rpc("my_gacha_pull", {
            p_world_id: world,
            p_count: count,
          })
        : await owner.value.db.rpc("gacha_pull", {
            p_device_id: owner.value.id,
            p_world_id: world,
            p_count: count,
          });
    if (error?.message === "not_enough_tickets") return notEnoughTickets();
    if (isRowLimit(error)) return limitReached(gachaLimitMessage(owner.value.kind));
    if (error) return serverError(action, error);
    return success({
      pulls: data.map((pull) => ({
        seq: pull.seq,
        itemId: pull.item_id,
        rarity: pull.rarity,
      })),
    });
  } catch (error) {
    return serverError(action, error);
  }
}

function readStatus(owner: Owner) {
  return owner.kind === "user"
    ? owner.db.rpc("my_gacha_status")
    : owner.db.rpc("gacha_status", { p_device_id: owner.id });
}

function readCollection(owner: Owner) {
  return owner.kind === "user"
    ? owner.db.rpc("my_gacha_collection")
    : owner.db.rpc("gacha_collection", { p_device_id: owner.id });
}
