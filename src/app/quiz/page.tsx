import type { Metadata } from "next";
import { QuizScreen } from "@/components/QuizScreen";
import { DEFAULT_WORLD_ID, themes } from "@/themes";

export const metadata: Metadata = { title: "テスト | エネスタ" };

export default function QuizPage() {
  return <QuizScreen theme={themes[DEFAULT_WORLD_ID]} />;
}
