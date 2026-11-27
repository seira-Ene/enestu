import { expect, test, type Page } from "@playwright/test";
import { SOUND_EFFECTS, VOLUME_GAINS } from "../src/domain/sound";
import { addStudy, openFirstTime, openTab, screen } from "./helpers";

/** 鳴らした音。偽物の音の出口が記録する。 */
type Played = { wave: string; freq: number };

/**
 * ブラウザの音の出口（AudioContext）を、鳴らした音を記録する偽物に替える。
 * 最初に作られる2つの音量は、効果音とBGMの全体の音量。
 */
async function installFakeAudio(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const log = { tones: [] as { wave: string; freq: number }[], gains: [] as { value: number }[] };
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
      connect() {
        return this;
      }
    }
    class GainStub extends AudioNodeStub {
      gain = new Param(1);
    }
    class OscillatorStub extends AudioNodeStub {
      type = "sine";
      frequency = new Param(0);
      start() {
        log.tones.push({ wave: this.type, freq: this.frequency.value });
      }
      stop() {}
    }
    class SourceStub extends AudioNodeStub {
      buffer: unknown = null;
      start() {
        log.tones.push({ wave: "noise", freq: 0 });
      }
      stop() {}
    }
    class FakeAudioContext {
      state = "running";
      currentTime = 0;
      sampleRate = 8000;
      destination = new AudioNodeStub();
      createGain() {
        const node = new GainStub();
        log.gains.push(node.gain);
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
