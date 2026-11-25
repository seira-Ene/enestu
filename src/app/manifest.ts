import type { MetadataRoute } from "next";
import { DEFAULT_WORLD_ID, themes } from "@/themes";

/** ホーム画面に追加したときの名前・アイコン・色。 */
export default function manifest(): MetadataRoute.Manifest {
  const { background } = themes[DEFAULT_WORLD_ID].colors;
  return {
    name: "エネスタ",
    short_name: "エネスタ",
    description: "その日の気分で世界線を選べる学習支援アプリ",
    lang: "ja",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: background,
    theme_color: background,
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        // 端末が好きな形に切り抜く。絵は中央の円に収めてある。
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
