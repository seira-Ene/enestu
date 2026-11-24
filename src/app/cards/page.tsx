import type { Metadata } from "next";
import { CardsScreen } from "@/components/CardsScreen";

export const metadata: Metadata = { title: "カード | エネスタ" };

export default function CardsPage() {
  return <CardsScreen />;
}
