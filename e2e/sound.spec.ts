import { expect, test, type Page } from "@playwright/test";
import { eventsBetween, eventTones, songSteps } from "../src/domain/bgm";
import { SOUND_EFFECTS, VOLUME_GAINS } from "../src/domain/sound";
import { cafe } from "../src/themes/cafe";
import { live } from "../src/themes/live";
import type { WorldTheme } from "../src/themes/types";
import { addStudy, openFirstTime, openTab, screen } from "./helpers";

/** 鳴らした音。偽物の音の出口が記録する。 */
type Played = { wave: string; freq: number; channel: "se" | "bgm" };

/**
 * ブラウザの音の出口（AudioContext）を、鳴らした音を記録する偽物に替える。
 * 最初に作られる2つの音量は、効果音とBGMの全体の音量。鳴らした音が、どちらにつながっていたかも記録する。
 */
async function installFakeAudio(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const log = {
      tones: [] as { wave: string; freq: number; channel: string }[],
      gains: [] as { value: number }[],
      nodes: [] as unknown[],
    };
    Object.assign(window, { __sound: log });
    class Param {
      constructor(public value = 0) {}
      setValueAtTime(value: number) {
        this.value = value;
        return this;
      }
      linearRampToValueAtTime() {
        return this;
      }
      exponentialRampToValueAtTime() {
        return this;
      }
      cancelScheduledValues() {
        return this;
      }
    }
    class AudioNodeStub {
      target: unknown = null;
      connect(target: unknown) {
        this.target = target;
        return target;
      }
      /** つながった先をたどって、効果音とBGMのどちらかを返す。 */
      channel(): string {
        const envelope = this.target as AudioNodeStub | null;
        return envelope?.target === log.nodes[1] ? "bgm" : "se";
      }
    }
    class GainStub extends AudioNodeStub {
      gain = new Param(1);
    }
    class OscillatorStub extends AudioNodeStub {
      type = "sine";
      frequency = new Param(0);
      start() {
        log.tones.push({ wave: this.type, freq: this.frequency.value, channel: this.channel() });
      }
      stop() {}
    }
    class SourceStub extends AudioNodeStub {
      buffer: unknown = null;
      start() {
        log.tones.push({ wave: "noise", freq: 0, channel: this.channel() });
      }
      stop() {}
    }
    class FakeAudioContext {
      state = "running";
      get currentTime() {
        return performance.now() / 1000;
      }
      sampleRate = 8000;
      destination = new AudioNodeStub();
      createGain() {
        const node = new GainStub();
        log.gains.push(node.gain);
        log.nodes.push(node);
        return node;
      }
      createOscillator() {
        return new OscillatorStub();
      }
      createBufferSource() {
        return new SourceStub();
      }
      createBuffer(_channels: number, length: number) {
        return { getChannelData: () => new Float32Array(length) };
      }
      resume() {
        return Promise.resolve();
      }
    }
    Object.assign(window, { AudioContext: FakeAudioContext });
  });
}

const played = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __sound: { tones: Played[] } }).__sound.tones,
  );
const seVolume = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __sound: { gains: { value: number }[] } }).__sound.gains[0]?.value,
  );

/** その効果音が鳴ったか。最初の音の高さで見分ける。 */
async function hasPlayed(page: Page, name: keyof typeof SOUND_EFFECTS): Promise<boolean> {
  const first = SOUND_EFFECTS[name][0];
  return (await played(page)).some(
    (tone) => tone.wave === first?.wave && Math.abs(tone.freq - (first?.from ?? 0)) < 0.01,
  );
}

async function openSoundSettings(page: Page) {
  await screen(page).getByRole("button", { name: "音", exact: true }).click();
  return page.getByRole("dialog", { name: "音の設定" });
}

test("キャラクターを押すと、効果音が鳴る", async ({ page }) => {
  await installFakeAudio(page);
  await openFirstTime(page);
  await page.getByRole("button", { name: /に話しかける$/ }).click();
  await expect.poll(() => hasPlayed(page, "tap")).toBe(true);
  await expect.poll(() => hasPlayed(page, "click")).toBe(true);
});

test("テストの正解と不正解で、違う音が鳴る", async ({ page, request }) => {
  await installFakeAudio(page);
  const device = crypto.randomUUID();
  await page.addInitScript((id) => localStorage.setItem("enestu_device_id", id), device);
  await request.post("/api/cards/bulk", {
    headers: { "x-device-id": device },
    data: {
      cards: ["問1", "問2"].map((question) => ({
        id: crypto.randomUUID(),
        subject: "数学",
        question,
        answer: "答え",
      })),
    },
  });
  await openFirstTime(page, "/quiz");
  const quiz = screen(page);
  await quiz.getByRole("button", { name: /（最大/ }).click();

  await quiz.getByRole("textbox").fill("答え");
  await quiz.getByRole("button", { name: "答える" }).click();
  await expect.poll(() => hasPlayed(page, "correct")).toBe(true);
  expect(await hasPlayed(page, "incorrect")).toBe(false);

  await quiz.getByRole("button", { name: "次へ" }).click();
  await quiz.getByRole("textbox").fill("ちがう");
  await quiz.getByRole("button", { name: "答える" }).click();
  await expect.poll(() => hasPlayed(page, "incorrect")).toBe(true);
});

test("効果音を消すと鳴らず、設定は読み込み直しても残る", async ({ page }) => {
  await installFakeAudio(page);
  await openFirstTime(page);
  const dialog = await openSoundSettings(page);
  const toggle = dialog.getByRole("button", { name: "効果音", exact: true });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await dialog.getByRole("button", { name: "閉じる" }).click();

  const before = (await played(page)).length;
  await page.getByRole("button", { name: /に話しかける$/ }).click();
  await page.getByRole("button", { name: /に話しかける$/ }).click();
  expect((await played(page)).length).toBe(before);

  await page.reload();
  const again = await openSoundSettings(page);
  await expect(again.getByRole("button", { name: "効果音", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(again.getByRole("group", { name: "効果音の音量" }).getByRole("button").first()).toBeDisabled();
});

test("音量を小・中・大で変えられる", async ({ page }) => {
  await installFakeAudio(page);
  await openFirstTime(page);
  const dialog = await openSoundSettings(page);
  const volume = dialog.getByRole("group", { name: "効果音の音量" });
  await expect(volume.getByRole("button", { name: "中" })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => seVolume(page)).toBe(VOLUME_GAINS.se.mid);

  await volume.getByRole("button", { name: "大" }).click();
  await expect.poll(() => seVolume(page)).toBe(VOLUME_GAINS.se.high);
  await volume.getByRole("button", { name: "小" }).click();
  await expect.poll(() => seVolume(page)).toBe(VOLUME_GAINS.se.low);
});

test("ガチャを引くと、光の玉とカードの音が鳴る", async ({ page }) => {
  await installFakeAudio(page);
  const device = crypto.randomUUID();
  await page.addInitScript((id) => localStorage.setItem("enestu_device_id", id), device);
  await addStudy({ device }, 30);
  await openFirstTime(page, "/gacha");
  await page.getByRole("region", { name: "ガチャを引く" }).getByRole("button", { name: /^単発/ }).click();
  await expect.poll(() => hasPlayed(page, "orb")).toBe(true);
  await expect.poll(() => hasPlayed(page, "flip"), { timeout: 10_000 }).toBe(true);
});

test("音を出せないブラウザでも、画面はそのまま使える", async ({ page }) => {
  await page.addInitScript(() => {
    Object.assign(window, { AudioContext: undefined });
  });
  await openFirstTime(page);
  await page.getByRole("button", { name: /に話しかける$/ }).click();
  await openTab(page, "カード");
  await expect(screen(page)).toHaveCount(1);
});

/** その曲で鳴る音の高さ（小数2桁）。打楽器も含む。 */
function songFrequencies({ bgm }: Pick<WorldTheme, "bgm">): Set<string> {
  return new Set(
    eventsBetween(bgm, 0, songSteps(bgm)).flatMap((event) =>
      eventTones(bgm, event)
        .filter((tone) => tone.wave !== "noise")
        .map((tone) => tone.from.toFixed(2)),
    ),
  );
}

const bgmTones = async (page: Page) =>
  (await played(page)).filter((tone) => tone.channel === "bgm");

/** BGMで鳴った音のうち、その曲にだけある高さの音の数。 */
async function onlyIn(page: Page, song: Set<string>, other: Set<string>): Promise<number> {
  return (await bgmTones(page)).filter((tone) => {
    const freq = tone.freq.toFixed(2);
    return song.has(freq) && !other.has(freq);
  }).length;
}

async function turnBgm(page: Page, isOn: boolean): Promise<void> {
  const dialog = await openSoundSettings(page);
  const toggle = dialog.getByRole("button", { name: "BGM", exact: true });
  if ((await toggle.getAttribute("aria-pressed")) !== String(isOn)) await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", String(isOn));
  await dialog.getByRole("button", { name: "閉じる" }).click();
}

const CAFE = songFrequencies(cafe);
// ライブの曲は、1拍目からキックが鳴るので、切り替わりをすぐ見分けられる。
const LIVE = songFrequencies(live);

test("BGMは最初は鳴らず、ONにすると世界線の曲が鳴る", async ({ page }) => {
  await installFakeAudio(page);
  await openFirstTime(page);
  await page.getByRole("button", { name: /に話しかける$/ }).click();
  await page.waitForTimeout(800);
  expect(await bgmTones(page)).toEqual([]);

  await turnBgm(page, true);
  await expect.poll(() => onlyIn(page, CAFE, LIVE)).toBeGreaterThan(0);
});

test("世界線を変えると、BGMが別の曲になる", async ({ page }) => {
  await installFakeAudio(page);
  await openFirstTime(page);
  await turnBgm(page, true);
  await expect.poll(() => onlyIn(page, CAFE, LIVE)).toBeGreaterThan(0);

  await screen(page).getByRole("button", { name: /世界線を変える/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: /^ライブ/ }).click();
  // 次の小節の頭で切り替わる（カフェの1小節は約3.2秒）。
  await expect.poll(() => onlyIn(page, LIVE, CAFE), { timeout: 10_000 }).toBeGreaterThan(0);
});

test("BGMをOFFにすると止まる", async ({ page }) => {
  await installFakeAudio(page);
  await openFirstTime(page);
  await turnBgm(page, true);
  await expect.poll(async () => (await bgmTones(page)).length).toBeGreaterThan(0);

  await turnBgm(page, false);
  // 予約済みの分が鳴り終わるのを待ってから、増えないことを確かめる。
  await page.waitForTimeout(600);
  const stopped = (await bgmTones(page)).length;
  await page.waitForTimeout(1500);
  expect((await bgmTones(page)).length).toBe(stopped);
});

test("BGMの設定は読み込み直しても残り、画面を押すまでは鳴らない", async ({ page }) => {
  await installFakeAudio(page);
  await openFirstTime(page);
  await turnBgm(page, true);

  await page.reload();
  await expect(page.getByRole("region", { name: /の応援$/ })).toBeVisible();
  await page.waitForTimeout(800);
  expect(await bgmTones(page)).toEqual([]);

  await page.getByRole("button", { name: /に話しかける$/ }).click();
  await expect.poll(async () => (await bgmTones(page)).length).toBeGreaterThan(0);
});

test("別のタブを見ている間はBGMを止め、戻ると再び鳴らす", async ({ page }) => {
  await installFakeAudio(page);
  await openFirstTime(page);
  await turnBgm(page, true);
  await expect.poll(async () => (await bgmTones(page)).length).toBeGreaterThan(0);

  const setHidden = (isHidden: boolean) =>
    page.evaluate((hidden) => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
      document.dispatchEvent(new Event("visibilitychange"));
    }, isHidden);

  await setHidden(true);
  await page.waitForTimeout(600);
  const hidden = (await bgmTones(page)).length;
  await page.waitForTimeout(1500);
  expect((await bgmTones(page)).length).toBe(hidden);

  await setHidden(false);
  await expect.poll(async () => (await bgmTones(page)).length).toBeGreaterThan(hidden);
});
