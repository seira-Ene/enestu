"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { AccountState } from "@/domain/account";
import { fetchAccountState } from "@/lib/account-api";
import { ACCOUNT_PROBLEM_EVENT } from "@/lib/api-client";
import { useRemote, type Remote } from "@/lib/use-remote";

const AccountContext = createContext<Remote<AccountState>>({
  data: null,
  error: null,
  reload: async () => {},
});

/** 今のログインの状態。 */
export function useAccount(): Remote<AccountState> {
  return useContext(AccountContext);
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const account = useRemote(fetchAccountState);
  const { reload } = account;

  // 使っている途中でログインが切れたり変わったりしたら、表示を直す。
  useEffect(() => {
    const handle = () => void reload();
    window.addEventListener(ACCOUNT_PROBLEM_EVENT, handle);
    return () => window.removeEventListener(ACCOUNT_PROBLEM_EVENT, handle);
  }, [reload]);

  return <AccountContext value={account}>{children}</AccountContext>;
}
