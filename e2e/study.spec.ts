import { expect, test } from "@playwright/test";
import {
  openFirstTime,
  openTab,
  recordStudy,
  screen,
  startStudy,
} from "./helpers";

test("タイマーで記録し、開き直しても残る", async ({ page }) => {
  await openFirstTime(page);
  await recordStudy(page, "線形代数");
  const history = screen(page).getByRole("listitem");
  await expect(history).toContainText(["線形代数"]);
  await page.reload();
  await expect(history).toContainText(["線形代数"]);
});

test("計測中に開き直しても、続きから計測できる", async ({ page }) => {
  await openFirstTime(page);
  await startStudy(page, "英語");
  await page.reload();
  await page.getByRole("button", { name: /（停止して記録）/ }).click();
  await expect(screen(page).getByRole("listitem")).toContainText(["英語"]);
});

test("カードを作って解き、結果と集計に出る", async ({ page }) => {
  await openFirstTime(page, "/cards");
  await page.getByRole("button", { name: "1枚ずつ" }).click();
  const cards = screen(page);
  await cards.locator("input[list=card-subjects]").fill("数学");
  await cards.getByLabel("問題", { exact: true }).fill("内角の和は？");
  await cards.getByLabel("答え", { exact: true }).fill("180度");
  await cards.getByRole("button", { name: /（登録）/ }).click();
  await expect(cards.getByText("登録しました。")).toBeVisible();

  await openTab(page, "テスト");
  const quiz = screen(page);
  await quiz.getByRole("button", { name: /（最大/ }).click();
  await expect(quiz.getByText("内角の和は？")).toBeVisible();
  await quiz.getByRole("textbox").fill("180度");
  await quiz.getByRole("button", { name: "答える" }).click();
  await quiz.getByRole("button", { name: "結果を見る" }).click();
  await expect(quiz.getByText("1 / 1問正解")).toBeVisible();

  await openTab(page, "集計");
  await expect(screen(page).getByText("数学").first()).toBeVisible();
});

test("世界線を切り替えても、記録はそのまま残る", async ({ page }) => {
  await openFirstTime(page);
  await recordStudy(page, "化学");
  await page.getByRole("button", { name: /世界線を変える/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /^ライブ/ })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-world", "live");
  await expect(
    page.getByRole("button", { name: "リハを始める（開始）" }),
  ).toBeVisible();
  await expect(screen(page).getByRole("listitem")).toContainText(["化学"]);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-world", "live");
});
