import Link from "next/link";
import { accountLabel, type AccountState } from "@/domain/account";
import { useAccount } from "./AccountProvider";
import { useSettings } from "./SettingsProvider";

/** 見出しの下に出す、ログインの状態とアカウント画面への入口。 */
export function AccountLink() {
  const { data, error } = useAccount();
  const heroName = useSettings().data?.heroName ?? null;
  const { status, action } = describe(data, error, heroName);
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
  heroName: string | null,
): { status: string; action: string } {
  switch (state?.kind) {
    case "guest":
      return { status: "記録はこの端末だけ", action: "ログイン" };
    case "signed_in":
      return {
        status: `${heroName ?? accountLabel(state.account)} さん`,
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
