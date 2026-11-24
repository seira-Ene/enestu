import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AccountProvider } from "@/components/AccountProvider";
import { BottomNav } from "@/components/BottomNav";
import { WorldProvider } from "@/components/WorldProvider";
import { WORLD_BOOT_SCRIPT } from "@/lib/world-boot";
import { DEFAULT_WORLD_ID, worldsToCss } from "@/themes";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
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
      // 描画前のスクリプトが書き換えるため、サーバーとの違いを許す。
      data-world={DEFAULT_WORLD_ID}
      suppressHydrationWarning
      className={`${geistSans.variable} h-full antialiased`}
    >
      <head>
        {/* どちらもテーマ定義から作る固定の文字列で、利用者の入力は含まない。 */}
        <style dangerouslySetInnerHTML={{ __html: worldsToCss() }} />
        <script dangerouslySetInnerHTML={{ __html: WORLD_BOOT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <AccountProvider>
          <WorldProvider>
            {children}
            <BottomNav />
          </WorldProvider>
        </AccountProvider>
      </body>
    </html>
  );
}
