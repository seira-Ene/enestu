"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Settings } from "@/domain/settings-input";
import { fetchSettings } from "@/lib/settings-api";
import { useRemote, type Remote } from "@/lib/use-remote";

const SettingsContext = createContext<Remote<Settings>>({
  data: null,
  error: null,
  reload: async () => {},
});

/** 保存してある設定。世界線と名前で、1回の取得を使い回す。 */
export function useSettings(): Remote<Settings> {
  return useContext(SettingsContext);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const settings = useRemote(fetchSettings);
  return <SettingsContext value={settings}>{children}</SettingsContext>;
}
