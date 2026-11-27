"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  channelGain,
  DEFAULT_SOUND_SETTINGS,
  SOUND_EFFECTS,
  type ChannelSetting,
  type SoundName,
  type SoundSettings,
} from "@/domain/sound";
import { playBgm, stopBgm } from "@/lib/bgm-player";
import { playTones, setChannelGain, unlockAudio } from "@/lib/sound-engine";
import { loadSoundSettings, saveSoundSettings } from "@/lib/sound-settings-store";
import { useWorld } from "./WorldProvider";

type SoundContextValue = {
  readonly settings: SoundSettings;
  readonly change: (channel: "se" | "bgm", setting: ChannelSetting) => void;
  /** 効果音を鳴らす。delay は今からの秒数。 */
  readonly play: (name: SoundName, delay?: number) => void;
};

const SoundContext = createContext<SoundContextValue>({
  settings: DEFAULT_SOUND_SETTINGS,
  change: () => {},
  play: () => {},
});

export function useSound(): SoundContextValue {
  return useContext(SoundContext);
}

/** 音の設定と、効果音を鳴らす入口。 */
export function SoundProvider({ children }: { children: ReactNode }) {
  // 設定は画面に描かない（開いたときだけ出す）ので、最初から端末の値を読む。
  const [settings, setSettings] = useState<SoundSettings>(() =>
    typeof window === "undefined" ? DEFAULT_SOUND_SETTINGS : loadSoundSettings(),
  );
  useEffect(() => {
    setChannelGain("se", channelGain("se", settings.se));
    setChannelGain("bgm", channelGain("bgm", settings.bgm));
  }, [settings]);

  // BGMは、ONで、画面が見えている間だけ鳴らす。世界線を変えたら、次の小節から替える。
  const { theme } = useWorld();
  const isBgmOn = settings.bgm.isOn;
  useEffect(() => {
    if (!isBgmOn) {
      stopBgm();
      return;
    }
    const update = () => {
      if (document.hidden) stopBgm();
      else playBgm(theme.bgm);
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, [isBgmOn, theme.bgm]);

  // 消しているときは全体の音量が0になり、鳴らす側が何もしない。
  const play = useCallback((name: SoundName, delay = 0) => {
    playTones(SOUND_EFFECTS[name], "se", delay);
  }, []);

  const change = useCallback((channel: "se" | "bgm", setting: ChannelSetting) => {
    setSettings((current) => {
      const next = { ...current, [channel]: setting };
      saveSoundSettings(next);
      return next;
    });
  }, []);

  useEffect(() => {
    // ブラウザは、画面が押されるまで音を出させない。押されたら音を出せる状態にする。
    const unlock = () => unlockAudio();
    // ボタンやリンクを押したら、小さな音を鳴らす。
    const click = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const target = event.target.closest("button, a[href]");
      if (target === null || target.matches(":disabled")) return;
      play("click");
    };
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown", unlock, true);
    document.addEventListener("click", click, true);
    return () => {
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown", unlock, true);
      document.removeEventListener("click", click, true);
    };
  }, [play]);

  return <SoundContext value={{ settings, change, play }}>{children}</SoundContext>;
}
