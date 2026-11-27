import { expect, test, type Page } from "@playwright/test";
import { dungeon } from "../src/themes/dungeon";
import {
  addPastPulls,
  addStudy,
  createUser,
  login,
  openFirstTime,
} from "./helpers";

const SUPER_OR_ABOVE =
  '[data-rarity="sr"], [data-rarity="ssr"], [data-rarity="ur"], [data-rarity="pr"]';
const DUNGEON_PRIZES = Object.values(dungeon.gacha.prizes).map(
  ({ name }) => name,
);

function ticketPanel(page: Page) {
  return page.getByRole("region", { name: "ガチャを引く" });
}

async function useDevice(page: Page): Promise<string> {
  const device = crypto.randomUUID();
  await page.addInitScript(
    (id) => localStorage.setItem("enestu_device_id", id),
    device,
  );
  return device;
}

function reveal(page: Page) {
  return page.getByRole("dialog");
}

/** 引いて、演出を飛ばして閉じる。 */
async function pull(page: Page, label: "単発" | "10連"): Promise<void> {
  await startPull(page, label);
  await reveal(page).getByRole("button", { name: "飛ばす" }).click();
  await reveal(page).getByRole("button", { name: "閉じる" }).click();
  await expect(reveal(page)).toHaveCount(0);
}

async function startPull(page: Page, label: "単発" | "10連"): Promise<void> {
  await ticketPanel(page)
    .getByRole("button", { name: new RegExp(`^${label}`) })
    .click();
}

const tickets = (page: Page, count: number) =>
  ticketPanel(page).getByText(`${count}枚`, { exact: true });

test("ホームから開け、券がなければ引けない", async ({ page, request }) => {
  const device = await useDevice(page);
  await openFirstTime(page);
  await page.getByRole("link", { name: "ガチャを引く" }).click();
  await expect(page).toHaveURL(/\/gacha$/);

  await expect(tickets(page, 0)).toBeVisible();
  for (const label of ["単発", "10連"]) {
    await expect(
      ticketPanel(page).getByRole("button", { name: new RegExp(`^${label}`) }),
    ).toBeDisabled();
  }
  await expect(page.getByRole("region", { name: "図鑑" })).toContainText(
    "（0 / 12）",
  );

  // ボタンを使わずに送っても、券がなければ断られる。
  const response = await request.post("/api/gacha", {
    headers: { "x-device-id": device },
    data: { world: "cafe", count: 1 },
  });
  expect(response.status()).toBe(409);
  expect(await response.json()).toMatchObject({ code: "tickets" });
});

test("学習でためた券で単発と10連を引くと、券が減り、図鑑に載る", async ({
  page,
}) => {
  const device = await useDevice(page);
  await addStudy({ device }, 11 * 30);
  // 最初に出るカフェとは別の世界線で、その景品だけが出ることを確かめる。
  await openFirstTime(page, "/gacha", "ダンジョン");
  await expect(tickets(page, 11)).toBeVisible();

  const results = page.getByRole("region", { name: "引いた結果" });
  await pull(page, "単発");
  await expect(results.getByRole("listitem")).toHaveCount(1);
  await expect(results.getByText("NEW")).toBeVisible();
  await expect(tickets(page, 10)).toBeVisible();

  await pull(page, "10連");
  await expect(results.getByRole("listitem")).toHaveCount(10);
  await expect(results.locator(SUPER_OR_ABOVE).first()).toBeVisible();
  await expect(tickets(page, 0)).toBeVisible();
  await expect(
    ticketPanel(page).getByRole("button", { name: /^単発/ }),
  ).toBeDisabled();

  // 選んでいる世界線の景品だけが出て、図鑑に載る。
  const collection = page.getByRole("region", { name: "図鑑" });
  for (const card of await results.getByRole("article").all()) {
    const name = (await card.getAttribute("aria-label"))?.split("：")[1] ?? "";
    expect(DUNGEON_PRIZES).toContain(name);
    await expect(collection.getByRole("article", { name: new RegExp(name) })).toHaveCount(1);
  }
  await expect(collection).not.toContainText("（0 / 12）");
});

test("ログイン中も引け、別の端末でも同じ図鑑になる", async ({ page, browser }) => {
  const user = await createUser("花子");
  await addStudy({ user }, 30);
  await openFirstTime(page);
  await login(page, user);
  await page.goto("/gacha");
  await expect(tickets(page, 1)).toBeVisible();
  await pull(page, "単発");
  await expect(tickets(page, 0)).toBeVisible();

  const context = await browser.newContext();
  const other = await context.newPage();
  await openFirstTime(other);
  await login(other, user);
  await other.goto("/gacha");
  await expect(other.getByRole("region", { name: "図鑑" })).toContainText(
    "（1 / 12）",
  );
  await expect(tickets(other, 0)).toBeVisible();
  await context.close();
});

test("PC版では、左のメニューからも開ける", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openFirstTime(page);
  await page
    .getByRole("navigation", { name: "画面の切り替え（左）" })
    .getByRole("link", { name: /ガチャ/ })
    .click();
  await expect(page).toHaveURL(/\/gacha$/);
});

test("引くと、光がたまり、カードがめくれ、まとめが出る", async ({ page }) => {
  const device = await useDevice(page);
  await addStudy({ device }, 10 * 30);
  await openFirstTime(page, "/gacha");
  await startPull(page, "10連");

  await expect(reveal(page).locator(".gacha-orb")).toBeVisible();
  await expect(reveal(page).getByRole("button", { name: "飛ばす" })).toBeVisible();
  // 待っていれば、自然にまとめまで進む。ウルトラレア以上が出たら、大きく見せる場面で次へ進める。
  const done = reveal(page).getByRole("heading", { name: "ガチャの結果" });
  const next = reveal(page).getByRole("button", { name: "次へ" });
  await expect(done.or(next)).toBeVisible({ timeout: 15_000 });
  while (await next.isVisible()) await next.click();
  await expect(done).toBeVisible();
  await expect(reveal(page).getByRole("status")).toContainText("10枚引きました。");
  await expect(reveal(page).getByRole("listitem")).toHaveCount(10);
  await reveal(page).getByRole("button", { name: "閉じる" }).click();
  await expect(reveal(page)).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "引いた結果" }).getByRole("listitem"),
  ).toHaveCount(10);
});

test("天井でウルトラレア以上が出ると、大きく見せてから、まとめに進む", async ({
  page,
}) => {
  const device = await useDevice(page);
  // 過去の99回でも券を使っているので、100枚分を用意する。
  await addStudy({ device }, 100 * 30);
  await addPastPulls(device, 99);
  await openFirstTime(page, "/gacha");
  await expect(ticketPanel(page)).toContainText("確定まで、あと1回");
  await startPull(page, "単発");

  await expect(reveal(page).getByText(/^(ウルトラレア|パラレルレア)！$/)).toBeVisible({
    timeout: 15_000,
  });
  await reveal(page).getByRole("button", { name: "次へ" }).click();
  await expect(reveal(page).getByRole("heading", { name: "ガチャの結果" })).toBeVisible();
  await expect(reveal(page).getByRole("status")).toContainText(/ウルトラレア|パラレルレア/);
});

test("動きを減らす設定では、演出なしで、まとめから見せる", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const device = await useDevice(page);
  await addStudy({ device }, 10 * 30);
  await openFirstTime(page, "/gacha");
  await startPull(page, "10連");

  // 演出すると3.6秒以上かかるので、2秒以内なら演出していない。
  await expect(reveal(page).getByRole("heading", { name: "ガチャの結果" })).toBeVisible({
    timeout: 2_000,
  });
  await expect(reveal(page).locator(".gacha-orb")).toHaveCount(0);
  await expect(reveal(page).getByRole("button", { name: "飛ばす" })).toHaveCount(0);
});

test("飛ばすと、待たずにまとめになる", async ({ page }) => {
  const device = await useDevice(page);
  await addStudy({ device }, 10 * 30);
  await openFirstTime(page, "/gacha");
  await startPull(page, "10連");

  await expect(reveal(page).locator(".gacha-orb")).toBeVisible();
  await reveal(page).getByRole("button", { name: "飛ばす" }).click();
  // 10連は自然に進むと3.6秒以上かかるので、2秒以内なら飛ばせている。
  await expect(reveal(page).getByRole("heading", { name: "ガチャの結果" })).toBeVisible({
    timeout: 2_000,
  });
});
