import { expect, test, type Page } from "@playwright/test";
import { dungeon } from "../src/themes/dungeon";
import { addStudy, createUser, login, openFirstTime } from "./helpers";

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

async function pull(page: Page, label: "単発" | "10連"): Promise<void> {
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
