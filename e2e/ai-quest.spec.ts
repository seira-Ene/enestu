import { expect, test, type Page } from "@playwright/test";
import { QUEST_STUDY_SECONDS } from "../src/domain/weakness";
import { cafe } from "../src/themes/cafe";
import {
  openFirstTime,
  readGeminiLast,
  recordStudy,
  signInWithAiKey,
} from "./helpers";

function questPanel(page: Page) {
  return page.getByRole("region", { name: cafe.quest.title });
}

async function ask(page: Page) {
  await page.goto("/stats");
  await questPanel(page)
    .getByRole("button", { name: "AIに今日のクエストを相談する" })
    .click();
}

test("AIに相談し、提案を今日のクエストにできる。達成の判定は今の決まりのまま", async ({
  page,
}) => {
  await signInWithAiKey(page);
  await page.goto("/");
  await recordStudy(page, "数学");
  await ask(page);

  const proposal = questPanel(page).getByRole("group", { name: "AIの提案" });
  await expect(proposal).toContainText("数学を15分だけ");
  await expect(proposal).toContainText("数学：15分学ぶ");
  await expect(proposal.getByRole("listitem")).toHaveText([
    "ノートを見直す",
    "大事な言葉を3つ書き出す",
  ]);

  // 送ったのは、囲んだ集計（数字）だけ。
  const { last } = await readGeminiLast();
  const material = String(last?.material);
  expect(material.split("\n")[0]).toBe("<集計>");
  expect(JSON.parse(material.split("\n")[1] ?? "")).toEqual([
    expect.objectContaining({ subject: "数学", answers30Days: 0 }),
  ]);

  await proposal.getByRole("button", { name: "このクエストにする" }).click();
  await expect(questPanel(page).getByRole("status")).toHaveText(
    "今日のクエストを、AIの提案にしました。",
  );
  await expect(questPanel(page)).toContainText("AIの提案（Gemini）");
  await expect(questPanel(page).getByRole("list", { name: "やること" })).toContainText(
    "ノートを見直す",
  );
  // 目標の量は、今の決まりのまま（15分）。
  await expect(questPanel(page).getByRole("meter")).toHaveAttribute(
    "aria-valuemax",
    String(QUEST_STUDY_SECONDS),
  );

  // 読み込み直しても、今日のあいだは残る。
  await page.reload();
  await expect(questPanel(page)).toContainText("数学を15分だけ");
});

test("集計にない科目を返されたら、使わずに今のクエストのまま", async ({ page }) => {
  await signInWithAiKey(page);
  await page.goto("/");
  await recordStudy(page, "架空テスト");
  await ask(page);
  await expect(questPanel(page).getByRole("alert")).toContainText(
    "AIの提案を使えませんでした。",
  );
  await expect(questPanel(page).getByRole("group", { name: "AIの提案" })).toHaveCount(0);
  await expect(questPanel(page)).not.toContainText("AIの提案（Gemini）");
});

test("集計がまだなければ、AIを呼ばずに断る", async ({ page }) => {
  await signInWithAiKey(page);
  const before = (await readGeminiLast()).count;
  await ask(page);
  await expect(questPanel(page).getByRole("alert")).toContainText("まだ集計がありません。");
  expect((await readGeminiLast()).count).toBe(before);
});

test("未ログインでは、相談のボタンを出さない", async ({ page }) => {
  await openFirstTime(page, "/stats");
  await expect(questPanel(page)).toBeVisible();
  await expect(
    questPanel(page).getByRole("button", { name: "AIに今日のクエストを相談する" }),
  ).toHaveCount(0);
});
