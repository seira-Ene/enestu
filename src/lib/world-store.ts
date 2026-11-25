import { useSyncExternalStore } from "react";
import { DEFAULT_WORLD_ID } from "@/themes";
import { isWorldId, type WorldId } from "@/themes/types";
import { STORAGE_KEY } from "./world-boot";

/** 選んだ世界線を、この端末に覚えておく。 */

const listeners = new Set<() => void>();

/** localStorage が使えない環境で代わりに使う値。 */
let memoryWorld: WorldId | null = null;

/** 画面に出す世界線。サーバーと初回描画では既定の世界線。 */
export function useWorldId(): WorldId {
  return useSyncExternalStore(
    subscribe,
    () => getStoredWorld() ?? DEFAULT_WORLD_ID,
    () => DEFAULT_WORLD_ID,
  );
}

/** この端末で選んだ世界線。サーバーと初回描画、まだ選んでいないときは null。 */
export function useStoredWorld(): WorldId | null {
  return useSyncExternalStore(subscribe, getStoredWorld, () => null);
}

/** まだ選んでいなければ null。 */
export function getStoredWorld(): WorldId | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isWorldId(value) ? value : null;
  } catch {
    return memoryWorld;
  }
}

export function setStoredWorld(worldId: WorldId): void {
  memoryWorld = worldId;
  try {
    localStorage.setItem(STORAGE_KEY, worldId);
  } catch {
    // 保存できない環境では memoryWorld だけで動かす。
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}
