import type { Metadata } from "next";
import { Suspense } from "react";
import { QuizScreen } from "@/components/QuizScreen";
import { DEFAULT_WORLD_ID, themes } from "@/themes";

export const metadata: Metadata = { title: "テスト | エネスタ" };

export default function QuizPage() {
  // URLの ?subject= はサーバーでは分からないため、Suspense で待つ。
  return (
    <Suspense fallback={<main className="flex-1 p-6">読み込んでいます…</main>}>
      <QuizScreen theme={themes[DEFAULT_WORLD_ID]} />
    </Suspense>
  );
}
