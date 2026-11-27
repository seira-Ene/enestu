import { expect, test, type Page } from "@playwright/test";
import { cafe } from "../src/themes/cafe";
import {
  addAnswers,
  addStudy,
  fillExplanations,
  openFirstTime,
  recordStudy,
} from "./helpers";

function missions(page: Page) {
  return page.getByRole("region", { name: "今日のミッション" });
}

function claimButton(page: Page, label: string) {
  return missions(page).getByRole("button", { name: `${label}の報酬を受け取る` });
}

async function useDevice(page: Page): Promise<string> {
  const device = crypto.randomUUID();
  await page.addInitScript(
    (id) => localStorage.setItem("enestu_device_id", id),
    device,
  );
  return device;
}

const prizeNames = (slots: readonly ("n1" | "n2" | "n3" | "r1" | "r2" | "r3")[]) =>
  slots.map((slot) => cafe.gacha.prizes[slot].name);

test("達成したミッションの報酬を受け取り、全部達成ボーナスまで受け取れる", async ({
  page,
}) => {
  const device = await useDevice(page);
  await addStudy({ device }, 15);
  await addAnswers(device, 5);
  await fillExplanations(device, 1);
  await openFirstTime(page);

  for (const progress of ["15 / 15分", "5 / 5問", "1 / 1個"]) {
    await expect(missions(page)).toContainText(progress);
  }
  await expect(claimButton(page, "全部達成ボーナス")).toHaveCount(0);

  const notice = missions(page).getByRole("status");
  await claimButton(page, "15分勉強する").click();
  await expect(notice).toHaveText("受け取りました：券1枚");
  await expect(claimButton(page, "15分勉強する")).toHaveCount(0);

  await claimButton(page, "問題を5問解く").click();
  await expect(notice).toContainText("受け取りました：素材「");
  const normal = await notice.innerText();
  expect(prizeNames(["n1", "n2", "n3"]).some((name) => normal.includes(name))).toBe(true);

  await claimButton(page, "用語を1つ説明する").click();
  await expect(notice).not.toHaveText(normal);
  const rare = await notice.innerText();
  expect(prizeNames(["r1", "r2", "r3"]).some((name) => rare.includes(name))).toBe(true);

  await claimButton(page, "全部達成ボーナス").click();
  await expect(notice).toHaveText("受け取りました：券1枚");
  await expect(missions(page).getByText("受け取り済み")).toHaveCount(4);

  // 券は2枚（学習15分と5問の経験値55では、まだ券にならない）、素材は図鑑に載る。
  await page.goto("/gacha");
  await expect(
    page.getByRole("region", { name: "ガチャを引く" }).getByText("2枚", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "図鑑" })).toContainText("（2 / 12）");
});

test("届いていないミッションは受け取れず、学習を記録すると数え直す", async ({
  page,
}) => {
  const device = await useDevice(page);
  await openFirstTime(page);
  await expect(missions(page)).toContainText("0 / 15分");
  await expect(missions(page).getByText("未達成")).toHaveCount(4);
  await expect(missions(page).getByRole("button")).toHaveCount(0);

  // 別の端末で15分学習した後に、この画面で記録すると、読み直さずに数え直す。
  await addStudy({ device }, 15);
  await recordStudy(page, "数学");
  await expect(missions(page)).toContainText("15 / 15分");
  await expect(claimButton(page, "15分勉強する")).toBeVisible();
});
