import { expect, test, type Page } from "@playwright/test";
import { limitMessage, ROW_LIMITS } from "../src/domain/limits";
import {
  createUser,
  fillExplanations,
  login,
  openFirstTime,
  openTab,
  recordStudy,
  screen,
} from "./helpers";

/** ブラウザがCSPで止めたものを集める。 */
function collectViolations(page: Page): string[] {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("Content Security Policy")) {
      violations.push(message.text());
    }
  });
  return violations;
}

test("画面とAPIに、セキュリティ用のヘッダーが付く", async ({ request }) => {
  for (const path of ["/", "/api/cards"]) {
    const response = await request.get(path, {
      headers: { "x-device-id": crypto.randomUUID() },
    });
    const headers = response.headers();
    expect(headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["x-powered-by"]).toBeUndefined();
  }
});

test("ヘッダーを付けても、全画面とログイン・同期が動く", async ({ page }) => {
  const violations = collectViolations(page);
  await openFirstTime(page);
  await recordStudy(page, "数学");
  for (const label of ["カード", "テスト", "集計", "メモ"]) {
    await openTab(page, label);
    await expect(screen(page)).toHaveCount(1);
  }
  await login(page, await createUser("花子"));
  await page.goto("/notes");
  // Realtimeへの接続（WebSocket）も止められない。
  await expect(page.getByText("同期中")).toBeVisible();
  expect(violations).toEqual([]);
});

test("件数の上限に達すると、止めて理由を伝える", async ({ page }) => {
  const deviceId = crypto.randomUUID();
  await fillExplanations(deviceId, ROW_LIMITS.explanation_logs.count);
  await page.addInitScript(
    (id) => localStorage.setItem("enestu_device_id", id),
    deviceId,
  );
  const limited = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/explanations") &&
      response.request().method() === "POST",
  );

  await openFirstTime(page);
  await openTab(page, "テスト");
  await page.getByRole("button", { name: "言語化" }).click();
  await screen(page)
    .getByLabel(/自分の言葉で説明してください/)
    .fill("植物が光を使って酸素を出す。");
  await page.getByRole("button", { name: "判定する" }).click();

  const response = await limited;
  expect(response.status()).toBe(429);
  expect(await response.json()).toMatchObject({ code: "limit" });
  await expect(
    screen(page).getByText(limitMessage("explanation_logs"), { exact: false }),
  ).toBeVisible();
});

test("ほかのサイトに埋め込まれない", async ({ page }) => {
  await page.goto("/");
  const blocked = await page.evaluate(
    () =>
      new Promise<boolean>((resolve) => {
        const frame = document.createElement("iframe");
        frame.src = "/";
        frame.onload = () => {
          try {
            // 埋め込みが拒まれると、中身を読めない。
            resolve(frame.contentDocument?.body?.innerText.includes("エネスタ") !== true);
          } catch {
            resolve(true);
          }
        };
        document.body.append(frame);
      }),
  );
  expect(blocked).toBe(true);
});
