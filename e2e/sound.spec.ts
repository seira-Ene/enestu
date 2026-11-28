import { expect, test, type Page } from "@playwright/test";
import { eventsBetween, eventTones, songSteps } from "../src/domain/bgm";
import { DUCK_LEVEL } from "../src/lib/sound-engine";
import {
  SOUND_EFFECTS,
  VOLUME_GAINS,
  WORLD_TAPS,
  type SoundName,
} from "../src/domain/sound";
import { cafe } from "../src/themes/cafe";
import { live } from "../src/themes/live";
import type { WorldTheme } from "../src/themes/types";
import {
  bgmLayers,
  bgmVolume,
  duckHistory,
  hasPlayed,
  installFakeAudio,
  played,
  seVolume,
} from "./fake-audio";
import { addStudy, openFirstTime, openTab, recordStudy, screen } from "./helpers";

/** その効果音が鳴ったか。 */
const hasEffect = (page: Page, name: SoundName) => hasPlayed(page, SOUND_EFFECTS[name]);

async function openSoundSettings(page: Page) {
  await screen(page).getByRole("button", { name: "音", exact: true }).click();
  return page.getByRole("dialog", { name: "音の設定" });
}

test("キャラクターを押すと、効果音が鳴る", async ({ page }) => {
  await installFakeAudio(page);
  await openFirstTime(page);
  await page.getByRole("button", { name: /に話しかける$/ }).click();
  await expect.poll(() => hasPlayed(page, WORLD_TAPS.cafe)).toBe(true);
  await expect.poll(() => hasEffect(page, "click")).toBe(true);
  // カフェのタップ音はベル：別の波で高さを揺らし、残響にも送る。
  const bells = (await played(page)).filter(
    (tone) => tone.channel === "se" && tone.wave === "sine" && tone.freq > 2000,
  );
  expect(bells.some((tone) => tone.modulated)).toBe(true);
  expect(bells.some((tone) => tone.reverb)).toBe(true);
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
  await expect.poll(() => hasEffect(page, "correct")).toBe(true);
  expect(await hasEffect(page, "incorrect")).toBe(false);

  await quiz.getByRole("button", { name: "次へ" }).click();
  await quiz.getByRole("textbox").fill("ちがう");
  await quiz.getByRole("button", { name: "答える" }).click();
  await expect.poll(() => hasEffect(page, "incorrect")).toBe(true);
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
  await expect.poll(() => hasEffect(page, "orb")).toBe(true);
  await expect.poll(() => hasEffect(page, "flip"), { timeout: 10_000 }).toBe(true);
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
  // だんだん大きくして、鳴らし始める。BGMの音は、どれも曲ごとの音量を通る。
  expect(await bgmLayers(page)).toEqual([[0, 1]]);
  expect((await bgmTones(page)).every((tone) => tone.layered)).toBe(true);
  // 効果音は通らない。
  expect((await played(page)).some((tone) => tone.channel === "se" && tone.layered)).toBe(false);
});

test("世界線を変えると、前の曲と重ねながら、別の曲に替える", async ({ page }) => {
  await installFakeAudio(page);
  await openFirstTime(page);
  await turnBgm(page, true);
  await expect.poll(() => onlyIn(page, CAFE, LIVE)).toBeGreaterThan(0);

  await screen(page).getByRole("button", { name: /世界線を変える/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: /^ライブ/ }).click();
  await expect.poll(() => onlyIn(page, LIVE, CAFE)).toBeGreaterThan(0);
  // 前の曲は小さくしながらしばらく鳴り、新しい曲は大きくしていく。
  const cafeAtSwitch = await onlyIn(page, CAFE, LIVE);
  await expect.poll(() => onlyIn(page, CAFE, LIVE)).toBeGreaterThan(cafeAtSwitch);
  const [old, next] = await bgmLayers(page);
  expect(old?.at(-1)).toBe(0);
  expect(next).toEqual([0, 1]);

  // 重ねる時間が過ぎたら、前の曲は鳴らさない。
  await page.waitForTimeout(2500);
  const cafeAfter = await onlyIn(page, CAFE, LIVE);
  await page.waitForTimeout(1500);
  expect(await onlyIn(page, CAFE, LIVE)).toBe(cafeAfter);
  expect(await onlyIn(page, LIVE, CAFE)).toBeGreaterThan(0);
});

test("BGMがOFFでも、試しに聞くと10秒だけ鳴り、また止まる", async ({ page }) => {
  test.setTimeout(30_000);
  await installFakeAudio(page);
  await openFirstTime(page);
  const dialog = await openSoundSettings(page);
  const preview = dialog.getByRole("button", { name: /BGMを試しに聞く|試しに聞くのをやめる/ });
  await preview.click();
  await expect(preview).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => onlyIn(page, CAFE, LIVE)).toBeGreaterThan(0);
  expect(await bgmVolume(page)).toBeGreaterThan(0);
  // BGMの設定は、OFFのまま。
  await expect(dialog.getByRole("button", { name: "BGM", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );

  // 最後の1秒で小さくしてから（その間はまだ試しに聞いている）、止める。
  await expect
    .poll(async () => (await bgmLayers(page))[0]?.at(-1), { timeout: 15_000, intervals: [100] })
    .toBe(0);
  await expect(preview).toHaveAttribute("aria-pressed", "true");
  await expect(preview).toHaveAttribute("aria-pressed", "false");
  expect(await bgmVolume(page)).toBe(0);
});

test("試しに聞いている途中でやめられ、ONにするとそのまま鳴り続ける", async ({ page }) => {
  test.setTimeout(30_000);
  await installFakeAudio(page);
  await openFirstTime(page);
  const dialog = await openSoundSettings(page);
  const preview = dialog.getByRole("button", { name: /BGMを試しに聞く|試しに聞くのをやめる/ });
  await preview.click();
  await expect.poll(async () => (await bgmTones(page)).length).toBeGreaterThan(0);
  await preview.click();
  await expect(preview).toHaveAttribute("aria-pressed", "false");
  expect(await bgmVolume(page)).toBe(0);

  // もう一度聞いて、途中でONにすると、試しに聞くボタンは消え、止まらずに鳴り続ける。
  await preview.click();
  await expect(preview).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "BGM", exact: true }).click();
  await expect(preview).toHaveCount(0);
  const layers = (await bgmLayers(page)).length;
  await page.waitForTimeout(11_000);
  expect(await bgmVolume(page)).toBeGreaterThan(0);
  expect(await bgmLayers(page)).toHaveLength(layers);
  expect((await bgmLayers(page)).at(-1)).toEqual([0, 1]);
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

test("キャラクターのタップ音は、世界線ごとに違う", async ({ page }) => {
  await installFakeAudio(page);
  await openFirstTime(page, "/", "ダンジョン");
  await page.getByRole("button", { name: /に話しかける$/ }).click();
  await expect.poll(() => hasPlayed(page, WORLD_TAPS.dungeon)).toBe(true);
  expect(await hasPlayed(page, WORLD_TAPS.cafe)).toBe(false);
});

test("レベルが上がると、レベルアップの音が鳴る", async ({ page }) => {
  await installFakeAudio(page);
  const device = crypto.randomUUID();
  await page.addInitScript((id) => localStorage.setItem("enestu_device_id", id), device);
  await openFirstTime(page);
  // 開いた後に、別の端末で学習したことにする（記録するとレベルが上がる）。
  await addStudy({ device }, 120);
  await recordStudy(page, "数学");
  await expect(page.getByRole("status").filter({ hasText: "Lv." })).toBeVisible();
  await expect.poll(() => hasEffect(page, "levelup")).toBe(true);
});

test("ミッションの報酬を受け取ると、達成の音が鳴る", async ({ page }) => {
  await installFakeAudio(page);
  const device = crypto.randomUUID();
  await page.addInitScript((id) => localStorage.setItem("enestu_device_id", id), device);
  await addStudy({ device }, 15);
  await openFirstTime(page);
  await page
    .getByRole("region", { name: "今日のミッション" })
    .getByRole("button", { name: "15分勉強するの報酬を受け取る" })
    .click();
  await expect.poll(() => hasEffect(page, "mission")).toBe(true);
});

test("効果音が鳴る間とガチャの演出中は、BGMを少し下げる", async ({ page }) => {
  await installFakeAudio(page);
  const device = crypto.randomUUID();
  await page.addInitScript((id) => localStorage.setItem("enestu_device_id", id), device);
  await addStudy({ device }, 30);
  await openFirstTime(page);
  await turnBgm(page, true);
  await expect.poll(async () => (await bgmTones(page)).length).toBeGreaterThan(0);

  // 効果音：下げてから、戻す。
  await page.getByRole("button", { name: /に話しかける$/ }).click();
  await expect.poll(() => duckHistory(page)).toContain(DUCK_LEVEL);
  expect((await duckHistory(page)).at(-1)).toBe(1);

  // ガチャの演出の間は下げ続け、閉じたら戻す。
  await page.goto("/gacha");
  await page.getByRole("region", { name: "ガチャを引く" }).getByRole("button", { name: /^単発/ }).click();
  await expect.poll(async () => (await duckHistory(page)).at(-1)).toBe(DUCK_LEVEL);
  const reveal = page.getByRole("dialog");
  await reveal.getByRole("button", { name: "飛ばす" }).click();
  await reveal.getByRole("button", { name: "閉じる" }).click();
  await expect.poll(async () => (await duckHistory(page)).at(-1)).toBe(1);
});
