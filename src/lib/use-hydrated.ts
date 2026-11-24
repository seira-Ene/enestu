import { useSyncExternalStore } from "react";

/**
 * サーバーと初回描画では false、その後は true。
 * 世界線は端末に覚えてあるため、初回は既定の世界線で描かれる。
 * 使わない世界線の画像を読み込まないように、画像を出す前に確かめる。
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

function subscribeNever(): () => void {
  return () => {};
}
