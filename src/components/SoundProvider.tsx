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
  effectTones,
  soundLength,
  type ChannelSetting,
  type SoundName,
  type SoundSettings,
} from "@/domain/sound";
import { playBgm, stopBgm } from "@/lib/bgm-player";
import { duckBgm, playTones, setChannelGain, unlockAudio } from "@/lib/sound-engine";
import { loadSoundSettings, saveSoundSettings } from "@/lib/sound-settings-store";
import { useWorld } from "./WorldProvider";

type SoundContextValue = {
  readonly settings: SoundSettings;
  readonly change: (channel: "se" | "bgm", setting: ChannelSetting) => void;
  /** 効果音を鳴らす。delay は今からの秒数。 */
  readonly play: (name: SoundName, delay?: number) => void;
  /** BGMを試しに聞いている間か。 */
  readonly isPreviewing: boolean;
  /** BGMを試しに聞く。聞いている間に呼ぶと、やめる。 */
  readonly togglePreview: () => void;
};

/** BGMを試しに聞く秒数。最後の1秒で小さくしていく。 */
export const PREVIEW_SECONDS = 10;
const PREVIEW_FADE_SECONDS = 1;

const SoundContext = createContext<SoundContextValue>({
  settings: DEFAULT_SOUND_SETTINGS,
  change: () => {},
  play: () => {},
  isPreviewing: false,
  togglePreview: () => {},
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
  // 試しに聞いている間は、BGMがOFFでも、選んでいる音量で鳴らす。
  const [isPreviewing, setIsPreviewing] = useState(false);
  useEffect(() => {
    setChannelGain("se", channelGain("se", settings.se));
    setChannelGain(
      "bgm",
      channelGain("bgm", isPreviewing ? { ...settings.bgm, isOn: true } : settings.bgm),
    );
  }, [settings, isPreviewing]);

  // 決まった秒数たったら、小さくしてから、試しに聞くのをやめる。
  useEffect(() => {
    if (!isPreviewing) return;
    let end: ReturnType<typeof setTimeout> | undefined;
    const fade = setTimeout(() => {
      stopBgm(PREVIEW_FADE_SECONDS);
      end = setTimeout(() => setIsPreviewing(false), PREVIEW_FADE_SECONDS * 1000);
    }, (PREVIEW_SECONDS - PREVIEW_FADE_SECONDS) * 1000);
    return () => {
      clearTimeout(fade);
      clearTimeout(end);
    };
  }, [isPreviewing]);
  const togglePreview = useCallback(() => setIsPreviewing((current) => !current), []);

  // BGMは、ONか試しに聞いている間で、画面が見えている間だけ鳴らす。
  // 世界線を変えたら、前の曲と重ねながら替える。
  // 試しに聞く最後に小さくしている間にONにしても、鳴らし直せるよう、両方を見て決める。
  const { theme } = useWorld();
  const isBgmOn = settings.bgm.isOn;
  useEffect(() => {
    if (!isBgmOn && !isPreviewing) {
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
  }, [isBgmOn, isPreviewing, theme.bgm]);

  // 消しているときは全体の音量が0になり、鳴らす側が何もしない。
  // タップは世界線ごとの音にし、ボタンの音のほかは、鳴っている間BGMを少し下げる。
  const world = theme.id;
  const play = useCallback(
    (name: SoundName, delay = 0) => {
      const tones = effectTones(name, world);
      playTones(tones, "se", delay);
      if (name !== "click") duckBgm(delay + soundLength(tones));
    },
    [world],
  );

  const change = useCallback((channel: "se" | "bgm", setting: ChannelSetting) => {
    // BGMをONにしたら、試しに聞くのは終わり（そのまま鳴らし続ける）。
    if (channel === "bgm" && setting.isOn) setIsPreviewing(false);
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
    // iPhone の Safari は、指を離したときの操作でないと音を出させないことがある。
    document.addEventListener("touchend", unlock, true);
    document.addEventListener("keydown", unlock, true);
    document.addEventListener("click", click, true);
    return () => {
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("touchend", unlock, true);
      document.removeEventListener("keydown", unlock, true);
      document.removeEventListener("click", click, true);
    };
  }, [play]);

  return <SoundContext value={{ settings, change, play, isPreviewing, togglePreview }}>{children}</SoundContext>;
}
