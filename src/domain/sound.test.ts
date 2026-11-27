import { describe, expect, it } from "vitest";
import {
  channelGain,
  DEFAULT_SOUND_SETTINGS,
  noteFrequency,
  parseSoundSettings,
  SOUND_EFFECTS,
  SOUND_NAMES,
  soundLength,
  VOLUME_GAINS,
} from "./sound";

describe("noteFrequency", () => {
  it("A4 は 440Hz、1オクターブで2倍", () => {
    expect(noteFrequency(69)).toBe(440);
    expect(noteFrequency(81)).toBeCloseTo(880);
    expect(noteFrequency(60)).toBeCloseTo(261.63, 2);
  });
});

describe("効果音", () => {
  it.each(SOUND_NAMES)("%s は、聞こえる高さで、1秒以内に終わる", (name) => {
    const tones = SOUND_EFFECTS[name];
    expect(tones.length).toBeGreaterThan(0);
    expect(soundLength(tones)).toBeLessThanOrEqual(1);
    for (const tone of tones) {
      expect(tone.gain).toBeGreaterThan(0);
      expect(tone.gain).toBeLessThanOrEqual(1);
      expect(tone.duration).toBeGreaterThan(0);
      if (tone.wave !== "noise") {
        expect(tone.from).toBeGreaterThanOrEqual(80);
        expect(tone.from).toBeLessThanOrEqual(5000);
      }
    }
  });

  it("正解は上がり、不正解は下がる。高さでも聞き分けられる", () => {
    const [correctFirst, correctLast] = [
      SOUND_EFFECTS.correct.at(0)?.from ?? 0,
      SOUND_EFFECTS.correct.at(-1)?.from ?? 0,
    ];
    expect(correctLast).toBeGreaterThan(correctFirst);
    const wrong = SOUND_EFFECTS.incorrect[0];
    expect(wrong?.to ?? 0).toBeLessThan(wrong?.from ?? 0);
    expect(wrong?.from ?? 0).toBeLessThan(correctFirst);
  });

  it("ボタンの音は、ほかの音より短く小さい", () => {
    const click = SOUND_EFFECTS.click;
    for (const name of SOUND_NAMES) {
      if (name === "click") continue;
      expect(soundLength(click)).toBeLessThanOrEqual(soundLength(SOUND_EFFECTS[name]));
    }
    expect(Math.max(...click.map((tone) => tone.gain))).toBeLessThanOrEqual(0.25);
  });
});

describe("設定", () => {
  it("最初は、効果音がON、BGMがOFF、どちらも音量は中", () => {
    expect(DEFAULT_SOUND_SETTINGS).toEqual({
      se: { isOn: true, level: "mid" },
      bgm: { isOn: false, level: "mid" },
    });
  });

  it("保存した設定を読み、壊れた部分は初期値に戻す", () => {
    expect(
      parseSoundSettings({ se: { isOn: false, level: "high" }, bgm: { isOn: true, level: "low" } }),
    ).toEqual({ se: { isOn: false, level: "high" }, bgm: { isOn: true, level: "low" } });
    expect(parseSoundSettings({ se: { isOn: "yes", level: "max" } })).toEqual(
      DEFAULT_SOUND_SETTINGS,
    );
    expect(parseSoundSettings(null)).toEqual(DEFAULT_SOUND_SETTINGS);
    expect(parseSoundSettings("壊れた値")).toEqual(DEFAULT_SOUND_SETTINGS);
  });

  it("音量は小・中・大の順に大きく、消していれば0", () => {
    for (const kind of ["se", "bgm"] as const) {
      const { low, mid, high } = VOLUME_GAINS[kind];
      expect(low).toBeLessThan(mid);
      expect(mid).toBeLessThan(high);
      expect(channelGain(kind, { isOn: false, level: "high" })).toBe(0);
      expect(channelGain(kind, { isOn: true, level: "mid" })).toBe(mid);
    }
    expect(VOLUME_GAINS.bgm.high).toBeLessThan(VOLUME_GAINS.se.high);
  });
});
