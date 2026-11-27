import { expect, test, type Page } from "@playwright/test";
import { BURST_TAPS, BURST_WINDOW_MS } from "../src/domain/talk";
import { cafe } from "../src/themes/cafe";
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

test("何度も続けて押すと、くすぐったがり、間を空けるとふだんに戻る", async ({
  page,
}) => {
  await openFirstTime(page);
  const button = page.getByRole("button", { name: /に話しかける$/ });
  const said = () => speech(page).innerText();

  for (let tap = 1; tap < BURST_TAPS; tap += 1) {
    await button.click();
    expect(cafe.character.talk).toContain(await said());
  }
  await button.click();
  await expect(speech(page)).toHaveText(
    new RegExp(`^(${cafe.character.burstTalk.join("|")})$`),
  );
  // 押し続けるあいだは、別のくすぐったいセリフを続ける。
  const first = await said();
  await button.click();
  await expect(speech(page)).not.toHaveText(first);
  expect(cafe.character.burstTalk).toContain(await said());

  await page.waitForTimeout(BURST_WINDOW_MS + 300);
  await button.click();
  await expect(speech(page)).not.toHaveText(
    new RegExp(`^(${cafe.character.burstTalk.join("|")})$`),
  );
  expect(cafe.character.talk).toContain(await said());
});
