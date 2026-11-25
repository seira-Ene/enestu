import { expect, type Locator, type Page } from "@playwright/test";
import { toRecord, toText } from "./fake/json";
import { FAKE_URL } from "./ports";

/** まねたSupabaseへの指示。 */
async function control(path: string): Promise<unknown> {
  const response = await fetch(`${FAKE_URL}/control/${path}`);
  return response.json();
}

export async function createUser(name: string): Promise<string> {
  const body = await control(`create-user?name=${encodeURIComponent(name)}`);
  return toText(toRecord(body).id);
}

export async function setRealtimeDown(isDown: boolean): Promise<void> {
  await control(isDown ? "realtime-down" : "realtime-up");
}

/** 初めて開いたときの、世界線の選択を済ませる。 */
export async function openFirstTime(page: Page, path = "/"): Promise<void> {
  await page.goto(path);
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /^カフェ/ }).click();
  await expect(dialog).toHaveCount(0);
}

export async function login(page: Page, userId: string): Promise<void> {
  await control(`next-login?id=${userId}`);
  await page.goto("/account");
  await page.getByRole("button", { name: "Googleでログイン" }).click();
  await expect(page.getByText("ログインしました。")).toBeVisible();
}

/** 1秒以上計測して記録する。 */
export async function recordStudy(page: Page, subject: string): Promise<void> {
  await startStudy(page, subject);
  await page.getByRole("button", { name: /（停止して記録）/ }).click();
  await expect(page.getByRole("button", { name: /（開始）/ })).toBeVisible();
}

/** 計測を始め、止められるようになるまで待つ。 */
export async function startStudy(page: Page, subject: string): Promise<void> {
  await page.getByPlaceholder("例：線形代数").fill(subject);
  await page.getByRole("button", { name: /（開始）/ }).click();
  await expect(page.getByRole("timer")).not.toContainText("00:00:00");
}

/** 下のナビで移る。 */
export async function openTab(page: Page, label: string): Promise<void> {
  await page
    .getByRole("navigation", { name: "画面の切り替え" })
    .getByRole("link", { name: label })
    .click();
}

/** 今見えている画面。移った後に隠れて残る、前の画面を除く。 */
export function screen(page: Page): Locator {
  return page.locator("main:visible");
}
