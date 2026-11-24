import type { Metadata } from "next";
import { StatsScreen } from "@/components/StatsScreen";

export const metadata: Metadata = { title: "集計 | エネスタ" };

export default function StatsPage() {
  return <StatsScreen />;
}
