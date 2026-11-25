"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getPageAccountId } from "@/lib/account-marker";
import { saveWorld } from "@/lib/settings-api";
import { PENDING_ATTRIBUTE } from "@/lib/world-boot";
import { loadWorldFont } from "@/lib/world-fonts";
import {
  getStoredWorld,
  setStoredWorld,
  useStoredWorld,
  useWorldId,
} from "@/lib/world-store";
import { DEFAULT_WORLD_ID, themes } from "@/themes";
import type { WorldId, WorldTheme } from "@/themes/types";
import { Backdrop } from "./Backdrop";
import { useSettings } from "./SettingsProvider";
import { WorldPicker } from "./WorldPicker";

type WorldContextValue = {
  readonly theme: WorldTheme;
  readonly openPicker: () => void;
};

const WorldContext = createContext<WorldContextValue>({
  theme: themes[DEFAULT_WORLD_ID],
  openPicker: () => {},
});

/** 今の世界線と、世界線を選ぶ画面を開く関数。 */
export function useWorld(): WorldContextValue {
  return useContext(WorldContext);
}

export function WorldProvider({ children }: { children: ReactNode }) {
  const worldId = useWorldId();
  const storedWorld = useStoredWorld();
  const { data: settings, error } = useSettings();
  /** 選ぶ画面を開くか。null なら、まだ開け閉めしていない。 */
  const [pickerChoice, setPickerChoice] = useState<boolean | null>(null);
  /** 端末とDBをそろえ終えたか、読み込みの間に選んだ。 */
  const isSettled = useRef(false);
  const isLoaded = settings !== null || error !== null;
  // 端末にもDBにもなければ、初回として選んでもらう。
  const isFirstTime =
    isLoaded && storedWorld === null && (settings?.worldId ?? null) === null;
  const isPickerOpen = pickerChoice ?? isFirstTime;

  useWorldAppearance(worldId);

  // 端末とDBの選択をそろえる。
  // ログイン中は、ほかの端末で選んだ世界線に合わせるため、DBを優先する。
  useEffect(() => {
    if (settings === null || isSettled.current) return;
    isSettled.current = true;
    const stored = getStoredWorld();
    const saved = settings.worldId;
    if (saved !== null && (stored === null || getPageAccountId() !== null)) {
      if (saved !== stored) setStoredWorld(saved);
    } else if (stored !== null && saved !== stored) {
      void saveWorld(stored);
    }
  }, [settings]);

  function handleSelect(next: WorldId) {
    isSettled.current = true;
    setStoredWorld(next);
    setPickerChoice(false);
    // 失敗しても、次に開いたときに端末の選択を送り直す。
    void saveWorld(next);
  }

  const openPicker = useCallback(() => setPickerChoice(true), []);
  const value = useMemo(
    () => ({ theme: themes[worldId], openPicker }),
    [worldId, openPicker],
  );

  return (
    <WorldContext value={value}>
      <Backdrop worldId={worldId} />
      {children}
      <WorldPicker
        isOpen={isPickerOpen}
        current={worldId}
        onSelect={handleSelect}
        // 選ばずに閉じたら今の世界線に決め、次から聞かない。
        onClose={() => handleSelect(worldId)}
      />
    </WorldContext>
  );
}

/** 選んだ世界線の配色とフォントを <html> に反映する。 */
function useWorldAppearance(worldId: WorldId): void {
  useLayoutEffect(() => {
    // 初回描画は既定の世界線のため、選択に追いつくまでは何もしない。
    if (worldId !== (getStoredWorld() ?? DEFAULT_WORLD_ID)) return;
    const root = document.documentElement;
    root.setAttribute("data-world", worldId);
    root.removeAttribute(PENDING_ATTRIBUTE);
  }, [worldId]);

  useEffect(() => {
    if (worldId !== (getStoredWorld() ?? DEFAULT_WORLD_ID)) return;
    let isCurrent = true;
    let applied: string | null = null;
    void loadWorldFont(worldId).then((className) => {
      if (!isCurrent || className === null) return;
      applied = className;
      document.documentElement.classList.add(className);
    });
    return () => {
      isCurrent = false;
      if (applied !== null) document.documentElement.classList.remove(applied);
    };
  }, [worldId]);
}
