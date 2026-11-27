import { expect, test, type Page } from "@playwright/test";
import { openFirstTime, screen } from "./helpers";

const HOUR_MS = 60 * 60 * 1000;

/** hours 時間前に始めた計測が、端末に残っている状態で開く。 */
async function openWithTimerStarted(page: Page, hours: number): Promise<void> {
  await openFirstTime(page);
  await page.evaluate((startedAt) => {
    localStorage.setItem(
      "enestu_active_session",
      JSON.stringify({
        id: crypto.randomUUID(),
        accountId: null,
        subject: "止め忘れ",
        startedAt,
        endedAt: null,
      }),
    );
  }, new Date(Date.now() - hours * HOUR_MS).toISOString());
  await page.reload();
}

test("24時間を超えて止め忘れても、記録として保存できる", async ({ page }) => {
  await openWithTimerStarted(page, 30);
  await expect(page.getByRole("timer")).toContainText(/30:00:\d\d/);
  await page.getByRole("button", { name: /（停止して記録）/ }).click();

  const history = screen(page).getByRole("listitem");
  await expect(history).toContainText([/止め忘れ[\s\S]*30時間0分\d秒/]);
  // 終わった日の合計に入る。
  await expect(screen(page).getByText(/^30時間0分\d秒$/).first()).toBeVisible();
});

test("100時間を超えても、タイマーの数字がはみ出さない", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await openWithTimerStarted(page, 123);
  const timer = page.getByRole("timer");
  await expect(timer).toContainText(/123:00:\d\d/);
  const fits = await timer.evaluate(
    (element) => element.scrollWidth <= element.clientWidth,
  );
  expect(fits).toBe(true);
});

test("999時間を超えたら保存できず、理由を伝える", async ({ page }) => {
  await openWithTimerStarted(page, 1000);
  await page.getByRole("button", { name: /（停止して記録）/ }).click();
  await expect(
    page.getByText(/999時間を超える記録は保存できません/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "記録せずにやめる" }),
  ).toBeVisible();
});
