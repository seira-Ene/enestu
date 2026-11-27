import { expect, test, type Page } from "@playwright/test";
import { fillDays } from "../src/domain/daily";
import { dungeon } from "../src/themes/dungeon";
import { addPastVisits, openFirstTime } from "./helpers";

const { greeting } = dungeon.character;

function panel(page: Page) {
  return page.getByRole("region", { name: "今日のあいさつ" });
}

/** 世界線をダンジョンにして、ホームを開く。端末IDを返す。 */
async function openHome(page: Page, daysAgo: readonly number[] = []): Promise<string> {
  const device = crypto.randomUUID();
  await page.addInitScript(
    (id) => localStorage.setItem("enestu_device_id", id),
    device,
  );
  if (daysAgo.length > 0) await addPastVisits(device, daysAgo);
  await openFirstTime(page, "/", "ダンジョン");
  return device;
}

const art = (page: Page) => panel(page).locator(".greeting-art");

const said = async (page: Page) => {
  const text = await panel(page).getByText(/^リュカ「/).innerText();
  return text.replace(/^リュカ「/, "").replace(/」$/, "");
};

test("初めての日は、受け取ると券がもらえ、同じ日はもう出ない", async ({
  page,
  request,
}) => {
  const device = await openHome(page);
  await expect(panel(page)).toContainText("券1枚");
  await expect(art(page)).toHaveCount(0);
  await panel(page).getByRole("button", { name: "受け取る" }).click();
  await expect(panel(page).getByRole("status")).toHaveText(
    "受け取りました：券1枚。1日連続ログイン中！",
  );
  await panel(page).getByRole("button", { name: "閉じる" }).click();
  await expect(panel(page)).toHaveCount(0);

  // ボタンを使わずに送っても、二重には受け取れない。
  const again = await request.post("/api/daily", {
    headers: { "x-device-id": device },
    data: { kind: "login", world: "dungeon" },
  });
  expect(again.status()).toBe(409);
  expect(await again.json()).toMatchObject({ code: "claimed" });

  await page.reload();
  await expect(page.getByRole("region", { name: /の応援$/ })).toBeVisible();
  await expect(panel(page)).toHaveCount(0);

  // もらった券で、ガチャを引ける。
  await page.goto("/gacha");
  await expect(
    page.getByRole("region", { name: "ガチャを引く" }).getByText("1枚", { exact: true }),
  ).toBeVisible();
});

test("3日以上空くと泣き、受け取ると笑顔で迎える", async ({ page }) => {
  await openHome(page, [3, 4]);
  await expect(art(page)).toHaveAttribute("data-mood", "sad");
  await expect(art(page).locator("img")).toHaveAttribute("src", /dungeon-sad/);
  expect(greeting.missed).toContain(await said(page));
  await expect(panel(page)).toContainText("3日ぶりのログイン");

  await panel(page).getByRole("button", { name: "受け取る" }).click();
  await expect(art(page)).toHaveAttribute("data-mood", "happy");
  await expect(art(page).locator("img")).toHaveAttribute("src", /dungeon-happy/);
  expect(greeting.returned).toContain(await said(page));
  await expect(panel(page).getByRole("status")).toContainText("1日連続");
});

test("2日空いただけなら、泣かない", async ({ page }) => {
  await openHome(page, [2]);
  await expect(panel(page)).toBeVisible();
  await expect(art(page)).toHaveCount(0);
});

test("7日連続の日は、喜んで、券3枚とレアの素材をくれる", async ({ page }) => {
  await openHome(page, [1, 2, 3, 4, 5, 6]);
  await expect(art(page)).toHaveAttribute("data-mood", "happy");
  expect(greeting.milestone.map((line) => fillDays(line, 7))).toContain(
    await said(page),
  );
  await expect(panel(page)).toContainText("券3枚とレアの素材・今日で7日連続");

  await panel(page).getByRole("button", { name: "受け取る" }).click();
  const rare = ["r1", "r2", "r3"] as const;
  const names = rare.map((slot) => dungeon.gacha.prizes[slot].name);
  const status = panel(page).getByRole("status");
  await expect(status).toContainText("券3枚、素材「");
  await expect(status).toContainText("7日連続ログイン中");
  const text = await status.innerText();
  expect(names.some((name) => text.includes(name))).toBe(true);
});

test("あとでにしても、ボタンから受け取れる", async ({ page }) => {
  await openHome(page);
  await panel(page).getByRole("button", { name: "あとで" }).click();
  await expect(panel(page)).toHaveCount(0);
  await page.getByRole("button", { name: "ログインボーナスを受け取る" }).click();
  await panel(page).getByRole("button", { name: "受け取る" }).click();
  await expect(panel(page).getByRole("status")).toContainText("券1枚");
});
