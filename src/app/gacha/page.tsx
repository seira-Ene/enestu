import type { Metadata } from "next";
import { GachaScreen } from "@/components/GachaScreen";

export const metadata: Metadata = { title: "ガチャ | エネスタ" };

export default function GachaPage() {
  return <GachaScreen />;
}
