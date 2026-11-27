import {
  toAccountState,
  type Account,
  type AccountState,
  type RecordCounts,
} from "@/domain/account";
import { getField, postForField, type ApiResult } from "./api-client";
import { getPageAccountId } from "./account-marker";

type AccountStatus = {
  readonly account: Account | null;
  readonly claimable: RecordCounts | null;
};

/** 画面の認識と実際のログインを突き合わせる。 */
export async function fetchAccountState(): Promise<ApiResult<AccountState>> {
  const result = await getField("/api/account", "status", isAccountStatus);
  if (!result.ok) return result;
  const { account, claimable } = result.value;
  return {
    ok: true,
    value: toAccountState(getPageAccountId(), account, claimable),
  };
}

/** 移した件数。 */
export type MovedCounts = Omit<RecordCounts, "heroName">;

/** この端末の記録と名前を、ログイン中の利用者へ移す。移した件数を返す。 */
export function claimRecords(): Promise<ApiResult<MovedCounts>> {
  return postForField("/api/account/claim", {}, "moved", isMovedCounts);
}

function isAccountStatus(value: unknown): value is AccountStatus {
  if (typeof value !== "object" || value === null) return false;
  const { account, claimable }: Partial<Record<keyof AccountStatus, unknown>> =
    value;
  return (
    (account === null || isAccount(account)) &&
    (claimable === null || isRecordCounts(claimable))
  );
}

function isAccount(value: unknown): value is Account {
  if (typeof value !== "object" || value === null) return false;
  const { id, name, email }: Partial<Record<keyof Account, unknown>> = value;
  return (
    typeof id === "string" &&
    (name === null || typeof name === "string") &&
    (email === null || typeof email === "string")
  );
}

function isRecordCounts(value: unknown): value is RecordCounts {
  if (typeof value !== "object" || value === null) return false;
  const { heroName }: { heroName?: unknown } = value;
  return (
    isMovedCounts(value) && (heroName === null || typeof heroName === "string")
  );
}

function isMovedCounts(value: unknown): value is MovedCounts {
  if (typeof value !== "object" || value === null) return false;
  const counts: Partial<Record<keyof MovedCounts, unknown>> = value;
  return (
    typeof counts.studyLogs === "number" &&
    typeof counts.cards === "number" &&
    typeof counts.answers === "number" &&
    typeof counts.terms === "number" &&
    typeof counts.explanations === "number"
  );
}
