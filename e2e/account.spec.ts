import { expect, test } from "@playwright/test";
import {
  createUser,
  login,
  openFirstTime,
  recordStudy,
  screen,
  startStudy,
} from "./helpers";

test("ログインして端末の記録を引き継ぎ、別の端末でも見える", async ({
  page,
  browser,
}) => {
  const user = await createUser("花子");
  await openFirstTime(page);
  await recordStudy(page, "物理");

  await login(page, user);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("学習1件");
  await dialog.getByRole("button", { name: "引き継ぐ" }).click();
  await expect(page.getByText("引き継ぎました：学習1件")).toBeVisible();

  const context = await browser.newContext();
  const other = await context.newPage();
  await openFirstTime(other);
  await login(other, user);
  await other.goto("/");
  await expect(screen(other).getByRole("listitem")).toContainText(["物理"]);
  await context.close();
});

test("ログアウトすると記録は見えなくなり、ログインすると戻る", async ({
  page,
}) => {
  const user = await createUser("太郎");
  await openFirstTime(page);
  await login(page, user);
  await page.goto("/");
  await recordStudy(page, "歴史");

  await page.goto("/account");
  await page.getByRole("button", { name: "ログアウト" }).click();
  await expect(
    page.getByRole("button", { name: "Googleでログイン" }),
  ).toBeVisible();
  await page.goto("/");
  await expect(screen(page).getByText(/まだ記録がありません/)).toBeVisible();

  await login(page, user);
  await page.goto("/");
  await expect(screen(page).getByRole("listitem")).toContainText(["歴史"]);
});

test("ログインが切れたら、黙って端末の記録にしない", async ({ page }) => {
  const user = await createUser("次郎");
  await openFirstTime(page);
  await login(page, user);
  await page.goto("/");
  await startStudy(page, "地理");
  await page.context().clearCookies({ name: /^enestu_session/ });
  await page.getByRole("button", { name: /（停止して記録）/ }).click();
  await expect(page.getByText(/記録はこの端末に残っています/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: /ログインし直す/ }),
  ).toBeVisible();

  await login(page, user);
  await page.goto("/");
  await page.getByRole("button", { name: "もう一度保存" }).click();
  await expect(screen(page).getByRole("listitem")).toContainText(["地理"]);
});
