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

/** 端末か利用者に、minutes 分の学習の記録を足す。ガチャの券を用意するときに使う。 */
export async function addStudy(
  owner: { readonly device: string } | { readonly user: string },
  minutes: number,
): Promise<void> {
  const [kind, id] = "user" in owner ? ["user", owner.user] : ["device", owner.device];
  await control(`add-study?kind=${kind}&owner=${id}&minutes=${minutes}`);
}

/** 1日の上限を試すため、その利用者がAIを count 回呼んだことにする。 */
export async function addAiRequests(user: string, count: number): Promise<void> {
  await control(`ai-requests?user=${user}&count=${count}`);
}

/** まねた Gemini が最後に受け取った頼み（確かめたい部分だけ）と、受け取った回数。 */
export async function readGeminiLast(): Promise<{
  last: Record<string, unknown> | null;
  count: number;
}> {
  const body = toRecord(await control("gemini-last"));
  const last = body.last;
  return {
    last: typeof last === "object" && last !== null ? toRecord(last) : null,
    count: Number(body.count),
  };
}

/** 保存されたAIのキーの行（暗号文と末尾4文字）。 */
export async function readAiKeyRow(
  user: string,
): Promise<readonly { ciphertext: string; last4: string }[]> {
  const body = await control(`ai-key?user=${user}`);
  const rows = toRecord(body).rows;
  return Array.isArray(rows)
    ? rows.map((row) => ({
        ciphertext: toText(toRecord(row).ciphertext),
        last4: toText(toRecord(row).last4),
      }))
    : [];
}

/** ミッションを試すため、その端末に今日の解答を count 件足す。 */
export async function addAnswers(device: string, count: number): Promise<void> {
  await control(`add-answers?device=${device}&count=${count}`);
}

/** 連続日数を試すため、その端末が daysAgo 日前に訪れたことにする。 */
export async function addPastVisits(
  device: string,
  daysAgo: readonly number[],
): Promise<void> {
  await control(`past-visits?device=${device}&days=${daysAgo.join(",")}`);
}

/** 天井を試すため、その端末がウルトラレア未満を過去に count 回引いたことにする。 */
export async function addPastPulls(device: string, count: number): Promise<void> {
  await control(`past-pulls?device=${device}&count=${count}`);
}

/** その端末に用語「光合成」を作り、上限を通さずに説明を count 件入れる。 */
export async function fillExplanations(
  deviceId: string,
  count: number,
): Promise<void> {
  await control(`fill-explanations?device=${deviceId}&count=${count}`);
}

export async function setRealtimeDown(isDown: boolean): Promise<void> {
  await control(isDown ? "realtime-down" : "realtime-up");
}

/** 初めて開いたときの、世界線の選択を済ませる。 */
export async function openFirstTime(
  page: Page,
  path = "/",
  world = "カフェ",
): Promise<void> {
  await page.goto(path);
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: new RegExp(`^${world}`) })
    .click();
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
