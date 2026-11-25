import { expect, test, type Page } from "@playwright/test";
import { createUser, login, openFirstTime, openTab } from "./helpers";

function speech(page: Page) {
  return page.getByRole("region", { name: /の応援$/ }).locator("[aria-live]");
}

async function saveName(page: Page, name: string): Promise<void> {
  await page.goto("/account");
  await page.getByLabel(/^名前（/).fill(name);
  await page.getByRole("button", { name: "この名前にする" }).click();
}

test("未ログインで名前を決めると呼ばれ、消すと呼ばれなくなる", async ({
  page,
}) => {
  await openFirstTime(page);
  await page.getByRole("link", { name: "主人公の名前を決める" }).click();
  await expect(page).toHaveURL(/\/account#hero$/);
  await saveName(page, "そら");
  await expect(page.getByText("ひよりが「そら」と呼びます。")).toBeVisible();

  await openTab(page, "タイマー");
  await expect(speech(page)).toContainText("そらさん");
  await page.reload();
  await expect(speech(page)).toContainText("そらさん");

  await page.goto("/account");
  await page.getByRole("button", { name: "名前を消す" }).click();
  await expect(page.getByText("名前を消しました。")).toBeVisible();
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "主人公の名前を決める" }),
  ).toBeVisible();
  await expect(speech(page)).not.toContainText("そら");
});

test("長すぎる名前や、使えない文字は断る", async ({ page }) => {
  await openFirstTime(page);
  await saveName(page, "あ".repeat(13));
  await expect(page.getByText("名前は12文字以内で入力してください。")).toBeVisible();
  await saveName(page, "そ\u200bら");
  await expect(page.getByText("名前に使えない文字が含まれています。")).toBeVisible();
});

test("ログインして引き継ぐと、別の端末でも同じ名前で呼ばれる", async ({
  page,
  browser,
}) => {
  const user = await createUser("花子");
  await openFirstTime(page);
  await saveName(page, "うみ");
  await expect(page.getByText("ひよりが「うみ」と呼びます。")).toBeVisible();

  await login(page, user);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("名前「うみ」");
  await dialog.getByRole("button", { name: "引き継ぐ" }).click();
  await expect(page.getByText("引き継ぎました：名前「うみ」")).toBeVisible();
  await expect(page.getByRole("link", { name: /うみ さん/ })).toBeVisible();

  const context = await browser.newContext();
  const other = await context.newPage();
  await openFirstTime(other, "/", "ライブ");
  await login(other, user);
  await other.goto("/");
  await expect(speech(other)).toContainText("うみさん");
  // 世界線もアカウントに合わせる。
  await expect(other.locator("html")).toHaveAttribute("data-world", "cafe");

  // 名前を変えても、アカウントの世界線は残る。
  await saveName(page, "なぎ");
  await expect(page.getByText("ひよりが「なぎ」と呼びます。")).toBeVisible();
  await other.evaluate(() => localStorage.setItem("enestu_world", "live"));
  await other.reload();
  await expect(speech(other)).toContainText("なぎさん");
  await expect(other.locator("html")).toHaveAttribute("data-world", "cafe");
  await context.close();
});
