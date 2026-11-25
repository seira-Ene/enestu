import { expect, test, type Page } from "@playwright/test";
import { openFirstTime, screen } from "./helpers";

test.use({
  viewport: { width: 1440, height: 900 },
  isMobile: false,
  hasTouch: false,
});

const SCREENS = ["カード", "テスト", "集計", "メモ", "タイマー"];

function sideNav(page: Page) {
  return page.getByRole("navigation", { name: "画面の切り替え（左）" });
}

/** 横にはみ出している幅。 */
function overflow(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
}

test("左のメニューですべての画面へ移れ、横にはみ出さない", async ({ page }) => {
  await openFirstTime(page);
  // 下のナビは、PC版では出さない。
  await expect(page.getByRole("navigation")).toHaveCount(1);
  for (const label of SCREENS) {
    const link = sideNav(page).getByRole("link", { name: label });
    await link.click();
    await expect(link).toHaveAttribute("aria-current", "page");
    await expect(screen(page)).toHaveCount(1);
    expect(await overflow(page)).toBe(0);
    // メニューと画面が重ならない。
    const menu = await page.getByRole("complementary").boundingBox();
    const main = await screen(page).boundingBox();
    expect((menu?.x ?? 0) + (menu?.width ?? 0)).toBeLessThanOrEqual(
      main?.x ?? 0,
    );
  }
});

test("ホームは絵とタイマーが横に並び、スクロールせずに始められる", async ({
  page,
}) => {
  await openFirstTime(page);
  const hero = await page.getByRole("region", { name: /の応援$/ }).boundingBox();
  const start = page.getByRole("button", { name: /（開始）/ });
  const button = await start.boundingBox();
  expect(hero).not.toBeNull();
  expect(button).not.toBeNull();
  expect((hero?.x ?? 0) + (hero?.width ?? 0)).toBeLessThan(button?.x ?? 0);
  await expect(start).toBeInViewport({ ratio: 1 });
});

test("キーボードだけで、画面と世界線を切り替えられる", async ({ page }) => {
  await openFirstTime(page);
  await sideNav(page).getByRole("link", { name: "集計" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/stats$/);

  await page.getByRole("button", { name: /世界線を変える/ }).focus();
  await page.keyboard.press("Enter");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /^探偵/ })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-world", "detective");
});
