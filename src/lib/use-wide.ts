import { useSyncExternalStore } from "react";

/** PC版になる幅。globals.css や各画面の「lg:」と同じ。 */
const WIDE_QUERY = "(min-width: 64rem)";

/**
 * PC版の幅か。サーバーと初回描画では false。
 * 見た目だけなら「lg:」を使い、PC版でだけ読み込む絵などに使う。
 */
export function useWide(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => false,
  );
}

function subscribe(listener: () => void): () => void {
  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
