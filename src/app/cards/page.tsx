import type { Metadata } from "next";
import { CardsScreen } from "@/components/CardsScreen";
import { DEFAULT_WORLD_ID, themes } from "@/themes";

export const metadata: Metadata = { title: "カード | エネスタ" };

export default function CardsPage() {
  return <CardsScreen theme={themes[DEFAULT_WORLD_ID]} />;
}
