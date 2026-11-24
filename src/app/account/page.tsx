import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountScreen } from "@/components/AccountScreen";

export const metadata: Metadata = { title: "アカウント | エネスタ" };

export default function AccountPage() {
  // URLの ?login= はサーバーでは分からないため、Suspense で待つ。
  return (
    <Suspense fallback={<main className="flex-1 p-6">読み込んでいます…</main>}>
      <AccountScreen />
    </Suspense>
  );
}
