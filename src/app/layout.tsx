import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DEFAULT_WORLD_ID, themes, themeToCssVars } from "@/themes";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "エネスタ",
  description: "その日の気分で世界線を選べる学習支援アプリ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={themeToCssVars(themes[DEFAULT_WORLD_ID])}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
