import type { Metadata } from "next";
import { StatsScreen } from "@/components/StatsScreen";
import { DEFAULT_WORLD_ID, themes } from "@/themes";

export const metadata: Metadata = { title: "集計 | エネスタ" };

export default function StatsPage() {
  return <StatsScreen theme={themes[DEFAULT_WORLD_ID]} />;
}
