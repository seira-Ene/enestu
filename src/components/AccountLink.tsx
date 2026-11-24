import Link from "next/link";
import type { AccountState } from "@/domain/account";
import { useAccount } from "./AccountProvider";

/** 見出しの下に出す、ログインの状態とアカウント画面への入口。 */
export function AccountLink() {
  const { data, error } = useAccount();
  const { status, action } = describe(data, error);
  return (
    <Link
      href="/account"
      className="flex min-h-6 items-center justify-between gap-3 text-xs"
    >
      <span className="min-w-0 truncate opacity-80">{status}</span>
      <span className="shrink-0 text-accent underline">{action}</span>
    </Link>
  );
}

function describe(
  state: AccountState | null,
  error: string | null,
): { status: string; action: string } {
  switch (state?.kind) {
    case "guest":
      return { status: "記録はこの端末だけ", action: "ログイン" };
    case "signed_in":
      return {
        status: `${state.account.name ?? state.account.email ?? "利用者"} さん`,
        action: "アカウント",
      };
    case "expired":
      return { status: "ログインが切れました", action: "ログインし直す" };
    case "changed":
      return { status: "ログインの状態が変わりました", action: "確認する" };
    case undefined:
      return {
        status: error === null ? "確認しています…" : "ログインを確認できません",
        action: "アカウント",
      };
  }
}
