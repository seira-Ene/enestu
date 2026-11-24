import { Suspense } from "react";
import { StudyScreen } from "@/components/StudyScreen";

export default function Home() {
  // URLの ?subject= はサーバーでは分からないため、Suspense で待つ。
  return (
    <Suspense fallback={<main className="flex-1 p-6">読み込んでいます…</main>}>
      <StudyScreen />
    </Suspense>
  );
}
