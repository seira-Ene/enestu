import { expect, test, type Page } from "@playwright/test";
import { createUser, login, openFirstTime, readAiKeyRow } from "./helpers";

/** Gemini のキーと同じ形（AIza で始まる39文字）の見本。本物のキーではない。 */
const KEY = `AIza${"Sy".repeat(15)}Exam1`;
const OTHER_KEY = `AIza${"Zx".repeat(15)}Oth9Z`;

function panel(page: Page) {
  return page.getByRole("region", { name: "AIの設定（Gemini）" });
}

/** /api/ai-key の応答の本文を集める。キーが入っていないことを確かめるため。 */
function collectResponses(page: Page): string[] {
  const bodies: string[] = [];
  page.on("response", async (response) => {
    if (!response.url().includes("/api/ai-key")) return;
    bodies.push(await response.text().catch(() => ""));
  });
  return bodies;
}

test("ログインすると、キーを保存・差し替え・削除でき、キーは画面にも応答にも出ない", async ({
  page,
}) => {
  const user = await createUser("花子");
  await openFirstTime(page);
  await login(page, user);
  const bodies = collectResponses(page);
  await page.goto("/account");

  await expect(panel(page)).toContainText("18歳以上の方が対象です。");
  await expect(panel(page)).toContainText("キーはまだ登録していません。");

  const input = panel(page).getByLabel("Gemini のAPIキー");
  await input.fill("AIza-short");
  await panel(page).getByRole("button", { name: "キーを保存" }).click();
  await expect(panel(page).getByRole("alert")).toContainText("Gemini のキーの形ではありません。");

  await input.fill(KEY);
  await panel(page).getByRole("button", { name: "キーを保存" }).click();
  await expect(panel(page).getByRole("status")).toHaveText("キーを保存しました。");
  await expect(panel(page)).toContainText(`登録済み：…${KEY.slice(-4)}`);
  await expect(panel(page).getByLabel("新しいキーに替える")).toHaveValue("");

  // 保存されたのは暗号文で、キーそのものではない。
  const [row] = await readAiKeyRow(user);
  expect(row?.last4).toBe(KEY.slice(-4));
  expect(row?.ciphertext).toMatch(/^v1\./);
  expect(row?.ciphertext).not.toContain(KEY);

  await page.reload();
  await expect(panel(page)).toContainText(`登録済み：…${KEY.slice(-4)}`);

  await panel(page).getByLabel("新しいキーに替える").fill(OTHER_KEY);
  await panel(page).getByRole("button", { name: "キーを保存" }).click();
  await expect(panel(page)).toContainText(`登録済み：…${OTHER_KEY.slice(-4)}`);
  expect(await readAiKeyRow(user)).toHaveLength(1);

  page.once("dialog", (dialog) => void dialog.accept());
  await panel(page).getByRole("button", { name: "キーを削除" }).click();
  await expect(panel(page)).toContainText("キーはまだ登録していません。");
  expect(await readAiKeyRow(user)).toEqual([]);

  expect(bodies.length).toBeGreaterThan(0);
  for (const body of bodies) {
    expect(body).not.toContain(KEY);
    expect(body).not.toContain(OTHER_KEY);
    expect(body).not.toContain("v1.");
  }
  expect(await page.content()).not.toContain(KEY);
});

test("未ログインでは、キーを登録できない", async ({ page, request }) => {
  await openFirstTime(page);
  await page.goto("/account");
  await expect(panel(page)).toContainText("ログインすると使えます。");
  await expect(panel(page).getByRole("textbox")).toHaveCount(0);

  const response = await request.post("/api/ai-key", {
    headers: { "x-device-id": crypto.randomUUID() },
    data: { provider: "gemini", key: KEY },
  });
  expect(response.status()).toBe(401);
  expect(await response.json()).toMatchObject({ code: "login_required" });
});
