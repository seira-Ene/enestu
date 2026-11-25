import { expect, test, type Page } from "@playwright/test";
import { openFirstTime, screen } from "./helpers";

/** ホームの、キャラクターのセリフ。 */
function speech(page: Page) {
  return page.getByRole("region", { name: /の応援$/ }).locator("[aria-live]");
}

test("絵・吹き出し・ボタンのどれを押しても、毎回ちがうセリフを話す", async ({
  page,
}) => {
  await openFirstTime(page);
  const hero = page.getByRole("region", { name: /の応援$/ });
  const box = await hero.boundingBox();
  if (box === null) throw new Error("絵が見つからない");
  const middle = box.x + box.width / 2;
  const actions = [
    // 絵の上の方
    () => page.mouse.click(middle, box.y + 40),
    // 吹き出しの下の方
    () => page.mouse.click(middle, box.y + box.height - 12),
    () => hero.getByRole("button", { name: /に話しかける$/ }).click(),
    () => page.keyboard.press("Enter"),
  ];
  for (const act of actions) {
    const before = await speech(page).innerText();
    await act();
    await expect(speech(page)).not.toHaveText(before);
  }
});

test("計測を始めると、話しかけたセリフから応援のセリフに戻る", async ({
  page,
}) => {
  await openFirstTime(page);
  await page.getByRole("button", { name: /に話しかける$/ }).click();
  const talk = await speech(page).innerText();
  await page.getByPlaceholder("例：線形代数").fill("生物");
  await page.getByRole("button", { name: /（開始）/ }).click();
  await expect(speech(page)).not.toHaveText(talk);
  await expect(
    screen(page).getByRole("button", { name: /（停止して記録）/ }),
  ).toBeVisible();
});
