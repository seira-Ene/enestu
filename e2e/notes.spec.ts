import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  createUser,
  login,
  openFirstTime,
  screen,
  setRealtimeDown,
} from "./helpers";

/** 1画素のPNG。送る前にJPEGへ変わる。 */
const PHOTO = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

/** ログインしてメモの画面を開いた、1台の端末。 */
async function openDevice(browser: Browser, userId: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await openFirstTime(page);
  await login(page, userId);
  await page.goto("/notes");
  await expect(page.getByText("同期中")).toBeVisible();
  return page;
}

async function send(page: Page, text: string): Promise<void> {
  await screen(page).getByRole("textbox").fill(text);
  await screen(page).getByRole("button", { name: "送る", exact: true }).click();
  await expect(page.getByText("送りました。")).toBeVisible();
}

async function closeAll(pages: readonly Page[]): Promise<void> {
  for (const page of pages) await page.context().close();
}

test.afterEach(() => setRealtimeDown(false));

test("未ログインでは、ログインを案内する", async ({ page }) => {
  await openFirstTime(page, "/notes");
  await expect(page.getByText(/ログインが必要です/)).toBeVisible();
});

test("スマホから送ると、読み込み直さずにPCへ届く", async ({ browser }) => {
  const user = await createUser("花子");
  const stranger = await createUser("別の人");
  const pc = await openDevice(browser, user);
  const phone = await openDevice(browser, user);
  const other = await openDevice(browser, stranger);

  await send(phone, "極限の定義は？");
  await expect(pc.getByText("極限の定義は？")).toBeVisible();

  await phone
    .locator("input[type=file][accept='image/*']")
    .last()
    .setInputFiles({ name: "note.png", mimeType: "image/png", buffer: PHOTO });
  await expect(phone.getByAltText("送る写真")).toBeVisible();
  await send(phone, "ノートの写真");
  const photo = pc.getByAltText(/メモの写真/);
  await expect(photo).toBeVisible();
  // 枠だけでなく、写真の中身まで読み込めている。
  await expect
    .poll(() => photo.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);

  phone.once("dialog", (dialog) => void dialog.accept());
  await phone
    .getByRole("listitem")
    .filter({ hasText: "ノートの写真" })
    .getByRole("button", { name: "消す" })
    .click();
  await expect(pc.getByText("ノートの写真")).toHaveCount(0);

  await expect(other.getByText(/まだありません/)).toBeVisible();
  await closeAll([pc, phone, other]);
});

test("切れたら知らせ、つなぎ直して、取りこぼしを取り直す", async ({
  browser,
}) => {
  const user = await createUser("花子");
  const pc = await openDevice(browser, user);
  const phone = await openDevice(browser, user);

  await setRealtimeDown(true);
  await expect(pc.getByText(/つなぎ直しています/)).toBeVisible();
  await send(phone, "切れている間のメモ");
  await expect(pc.getByText("切れている間のメモ")).toHaveCount(0);

  await setRealtimeDown(false);
  await expect(pc.getByText("同期中")).toBeVisible({ timeout: 40_000 });
  await expect(pc.getByText("切れている間のメモ")).toBeVisible();
  await closeAll([pc, phone]);
});
