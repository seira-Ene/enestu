import { parseText, parseUuid } from "./validation";

/** ログインしている利用者。名前とメールは画面に出すためだけに使う。 */
export type Account = {
  readonly id: string;
  readonly name: string | null;
  readonly email: string | null;
};

/** メールアドレスの最大の長さに合わせる。 */
const MAX_PROFILE_LENGTH = 254;

/**
 * 検証済みのトークンの中身から、利用者を読み取る。
 * 名前とメールはログインのたびにGoogleの値で更新されるため、別の表には写さない。
 */
export function parseAccount(claims: unknown): Account | null {
  if (typeof claims !== "object" || claims === null) return null;
  const fields = new Map<string, unknown>(Object.entries(claims));
  const id = parseUuid(fields.get("sub"));
  if (!id.ok || fields.get("role") !== "authenticated") return null;
  // 匿名ログインは使わない。設定を誤っても利用者として扱わない。
  if (fields.get("is_anonymous") === true) return null;

  const metadata = fields.get("user_metadata");
  const profile = new Map<string, unknown>(
    typeof metadata === "object" && metadata !== null
      ? Object.entries(metadata)
      : [],
  );
  return {
    id: id.value,
    name: profileText(profile.get("full_name") ?? profile.get("name")),
    email: profileText(fields.get("email")),
  };
}

function profileText(value: unknown): string | null {
  const text = parseText(value, { label: "表示名", max: MAX_PROFILE_LENGTH });
  return text.ok ? text.value : null;
}

/** 画面に出す、アカウントの呼び名。 */
export function accountLabel(account: Account): string {
  return account.name ?? account.email ?? "名前のないアカウント";
}

/** 記録の件数。隠したカードは数えない。 */
export type RecordCounts = {
  readonly studyLogs: number;
  readonly cards: number;
  readonly answers: number;
};

export function hasRecords(counts: RecordCounts): boolean {
  return counts.studyLogs > 0 || counts.cards > 0 || counts.answers > 0;
}

/** 「学習3件・カード6枚」のように、ある分だけを並べる。 */
export function describeCounts(counts: RecordCounts): string {
  const parts = [
    counts.studyLogs > 0 && `学習${counts.studyLogs}件`,
    counts.cards > 0 && `カード${counts.cards}枚`,
    counts.answers > 0 && `解答${counts.answers}件`,
  ].filter((part) => part !== false);
  return parts.length > 0 ? parts.join("・") : "なし";
}

/** 画面から見たログインの状態。 */
export type AccountState =
  | { readonly kind: "guest" }
  | {
      readonly kind: "signed_in";
      readonly account: Account;
      /** 端末に残っていて、引き継げる記録。 */
      readonly claimable: RecordCounts | null;
    }
  | { readonly kind: "expired" }
  /** 画面を開いた後に、別の人になった。 */
  | { readonly kind: "changed" };

/** 画面を開いたときの利用者と、サーバーが確かめた利用者を突き合わせる。 */
export function toAccountState(
  pageAccountId: string | null,
  account: Account | null,
  claimable: RecordCounts | null,
): AccountState {
  if (account === null) {
    return { kind: pageAccountId === null ? "guest" : "expired" };
  }
  return account.id === pageAccountId
    ? { kind: "signed_in", account, claimable }
    : { kind: "changed" };
}

/** 記録の持ち主を決める材料。 */
export type OwnerClues = {
  /** 画面が「この利用者として使っている」と伝えた値。未ログインの画面なら null。 */
  readonly accountId: string | null;
  readonly deviceId: string | null;
  /** 検証できたログイン。なければ null。 */
  readonly sessionUserId: string | null;
};

export type OwnerDecision =
  | { readonly kind: "device"; readonly id: string }
  | { readonly kind: "user"; readonly id: string }
  /** ログインが切れている。未ログインの記録として保存してはいけない。 */
  | { readonly kind: "signed_out" }
  /** 画面を開いた後に、ログインの状態が変わっている。 */
  | { readonly kind: "account_changed" }
  | { readonly kind: "invalid"; readonly error: string };

/**
 * 記録の持ち主を決める。
 * 画面の認識と実際のログインが食い違ったら、どちらのものにもせず止める。
 */
export function decideOwner(clues: OwnerClues): OwnerDecision {
  const { accountId, sessionUserId } = clues;
  if (accountId === null) {
    if (sessionUserId !== null) return { kind: "account_changed" };
    const device = parseUuid(clues.deviceId);
    return device.ok
      ? { kind: "device", id: device.value }
      : { kind: "invalid", error: device.error };
  }

  const expected = parseUuid(accountId);
  if (!expected.ok) return { kind: "invalid", error: expected.error };
  if (sessionUserId === null) return { kind: "signed_out" };
  return expected.value === sessionUserId
    ? { kind: "user", id: sessionUserId }
    : { kind: "account_changed" };
}
