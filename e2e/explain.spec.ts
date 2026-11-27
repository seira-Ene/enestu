import { expect, test, type Page } from "@playwright/test";
import { createUser, login, openFirstTime, openTab, screen } from "./helpers";

async function addTerm(
  page: Page,
  subject: string,
  term: string,
  keywords: readonly string[],
): Promise<void> {
  await openTab(page, "カード");
  await page.getByRole("button", { name: "用語", exact: true }).click();
  const form = page.getByRole("form", { name: "言葉で説明したい用語" });
  await form.getByLabel("科目名").fill(subject);
  await form.getByLabel("用語", { exact: true }).fill(term);
  await form.getByLabel(/^説明に入れたい観点/).fill(keywords.join("\n"));
  await form.getByRole("button", { name: "用語を登録" }).click();
  await expect(form.getByText(/^登録しました。/)).toBeVisible();
}

async function openExplain(page: Page): Promise<void> {
  await openTab(page, "テスト");
  await page.getByRole("button", { name: "言語化" }).click();
}

async function explain(page: Page, text: string): Promise<void> {
  await screen(page).getByLabel(/自分の言葉で説明してください/).fill(text);
  await page.getByRole("button", { name: "判定する" }).click();
}

const PHOTOSYNTHESIS = ["二酸化炭素/CO2", "酸素", "光のエネルギー"];

test("用語を説明すると理解度が出て、足りない観点を足して書き直せる", async ({
  page,
}) => {
  await openFirstTime(page);
  await addTerm(page, "理科", "光合成", PHOTOSYNTHESIS);
  await openExplain(page);

  // 判定するまで、観点を見せない。
  await expect(page.getByText("「光合成」を、自分の言葉で")).toBeVisible();
  await expect(screen(page).getByText("光のエネルギー")).toHaveCount(0);

  await explain(page, "植物が ＣＯ２ を吸って、酸素を出すはたらき。");
  const result = screen(page).getByRole("status").filter({ hasText: "理解度" });
  await expect(result).toContainText("67%");
  await expect(result).toContainText("3個中2個の観点");
  await expect(result).toContainText("足りなかった観点△ 光のエネルギー");
  await expect(result).toContainText("○ 二酸化炭素/CO2");

  await page.getByRole("button", { name: "書き直す" }).click();
  await expect(
    screen(page).getByLabel(/自分の言葉で説明してください/),
  ).toHaveValue("植物が ＣＯ２ を吸って、酸素を出すはたらき。");
  await explain(
    page,
    "植物が光のエネルギーを使い、二酸化炭素と水から養分を作って酸素を出すはたらき。",
  );
  await expect(result).toContainText("100%");

  await openTab(page, "集計");
  await expect(screen(page).getByText("平均84%（2回）")).toBeVisible();
});

test("言葉を並べただけなら、文で書くよう伝える", async ({ page }) => {
  await openFirstTime(page);
  await addTerm(page, "理科", "光合成", PHOTOSYNTHESIS);
  await openExplain(page);
  await explain(page, "CO2、酸素、光のエネルギー");
  await expect(screen(page).getByText("100%").first()).toBeVisible();
  await expect(page.getByText(/文で説明してみましょう/)).toBeVisible();
});

test("用語を直すと、次の判定から新しい観点で数える", async ({ page }) => {
  await openFirstTime(page);
  await addTerm(page, "理科", "光合成", ["酸素"]);
  const row = page.getByRole("region", { name: /用語（/ });
  await row.getByRole("button", { name: "編集" }).click();
  await row.getByLabel(/^説明に入れたい観点/).fill("酸素\n養分");
  await row.getByRole("button", { name: "変更を保存" }).click();
  await expect(row.getByText("観点を見る（2個）")).toBeVisible();

  await openExplain(page);
  await explain(page, "酸素を出すはたらき");
  await expect(screen(page).getByText("2個中1個の観点")).toBeVisible();
});

test("説明を書きかけて一問一答に切り替えても、戻れば残っている", async ({
  page,
}) => {
  await openFirstTime(page);
  await addTerm(page, "理科", "光合成", PHOTOSYNTHESIS);
  await openExplain(page);
  const box = screen(page).getByLabel(/自分の言葉で説明してください/);
  await box.fill("書きかけ");
  await page.getByRole("button", { name: "一問一答" }).click();
  await expect(box).toBeHidden();
  await page.getByRole("button", { name: "言語化" }).click();
  await expect(box).toHaveValue("書きかけ");
});

test("ログインして引き継ぐと、用語と説明も別の端末で見える", async ({
  page,
  browser,
}) => {
  const user = await createUser("花子");
  await openFirstTime(page);
  await addTerm(page, "理科", "光合成", PHOTOSYNTHESIS);
  await openExplain(page);
  await explain(page, "酸素を出すはたらき");
  await expect(screen(page).getByText("3個中1個の観点")).toBeVisible();

  await login(page, user);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("用語1個・説明1件");
  await dialog.getByRole("button", { name: "引き継ぐ" }).click();
  await expect(page.getByText(/引き継ぎました：用語1個・説明1件/)).toBeVisible();

  const context = await browser.newContext();
  const other = await context.newPage();
  await openFirstTime(other);
  await login(other, user);
  await openExplain(other);
  await expect(other.getByText("「光合成」を、自分の言葉で")).toBeVisible();
  await expect(
    screen(other).getByRole("listitem").filter({ hasText: "光合成" }),
  ).toContainText("33%");
  await context.close();
});
