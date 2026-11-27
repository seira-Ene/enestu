import {
  DEFAULT_SOUND_SETTINGS,
  parseSoundSettings,
  type SoundSettings,
} from "@/domain/sound";

/** 音の設定は、この端末に覚えておく。 */

const STORAGE_KEY = "enestu_sound";

export function loadSoundSettings(): SoundSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === null ? DEFAULT_SOUND_SETTINGS : parseSoundSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SOUND_SETTINGS;
  }
}

export function saveSoundSettings(settings: SoundSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // 保存できなくても、開いている間はその設定で鳴らす。
  }
}
