import { expect, test } from "@playwright/test";
import { toRecord, toText } from "./fake/json";

test("ホーム画面に追加するための情報とアイコンがある", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const href = await page.locator("link[rel=manifest]").getAttribute("href");
  const manifest = toRecord(await (await request.get(href ?? "")).json());
  expect(manifest).toMatchObject({
    name: "エネスタ",
    display: "standalone",
    start_url: "/",
  });

  const icons = Array.isArray(manifest.icons)
    ? manifest.icons.map(toRecord)
    : [];
  expect(icons.map(({ sizes, purpose }) => [sizes, purpose])).toEqual([
    ["192x192", "any"],
    ["512x512", "any"],
    ["512x512", "maskable"],
  ]);
  const touchIcon = await page
    .locator("link[rel=apple-touch-icon]")
    .getAttribute("href");
  for (const src of [...icons.map((icon) => toText(icon.src)), touchIcon]) {
    const response = await request.get(src ?? "");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
  }
});
