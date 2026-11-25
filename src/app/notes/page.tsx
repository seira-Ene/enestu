import type { Metadata } from "next";
import { NotesScreen } from "@/components/NotesScreen";

export const metadata: Metadata = { title: "メモ | エネスタ" };

export default function NotesPage() {
  return <NotesScreen />;
}
