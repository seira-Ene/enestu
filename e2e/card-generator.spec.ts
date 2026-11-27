import { expect, test, type Page } from "@playwright/test";
import { openFirstTime, screen } from "./helpers";

const NOTES = [
  "# 植物のはたらき",
  "光のエネルギーを使って養分をつくるはたらきを光合成という。光合成は葉緑体で行われる。",
  "- 気孔とは、葉の表面にある小さなすきまのことである。",
  "植物は根から**水**を吸い上げる。",
  "今日は晴れです。",
].join("\n");

async function openGenerator(page: Page) {
  await openFirstTime(page, "/cards");
  const cards = screen(page);
  await cards
    .getByRole("group", { name: "取り込みかた" })
    .getByRole("button", { name: "文章から（AIなし）" })
    .click();
  return cards;
}

test("文章から候補を作り、元の文と見比べて直し、登録できる", async ({ page }) => {
  const cards = await openGenerator(page);
  await cards.getByLabel("科目名（全部に付けます）").fill("理科");
  await cards.getByLabel("文章を貼り付け").fill(NOTES);
  await cards.getByRole("button", { name: "候補をつくる" }).click();

  await expect(cards.getByRole("status")).toContainText("3枚の候補を読み取りました。");
  await expect(cards.getByRole("status")).toContainText("簡易生成（AIなし）");
  await expect(cards.getByLabel("候補1の問題")).toHaveValue(
    "光のエネルギーを使って養分をつくるはたらきを何という？",
  );
  await expect(cards.getByLabel("候補1の答え")).toHaveValue("光合成");
  await expect(cards.getByLabel("候補1の科目名")).toHaveValue("理科");
  await expect(cards.getByText(/^元の文：/)).toHaveCount(3);
  await expect(cards.getByLabel("候補3の問題")).toHaveValue("植物は根から（　）を吸い上げる。");

  // 直してから登録する。不要な候補は外す。
  await cards.getByLabel("候補2の答え").fill("気孔（きこう）");
  await cards.getByRole("listitem").filter({ hasText: "候補 3" }).getByRole("button", { name: "外す" }).click();
  await cards.getByRole("button", { name: /（2枚を登録）$/ }).click();

  await expect(cards.getByRole("status")).toHaveText("2枚を登録しました。");
  await expect(cards.getByText("光のエネルギーを使って養分をつくるはたらきを何という？")).toBeVisible();
  await expect(cards.getByText("葉の表面にある小さなすきまを何という？")).toBeVisible();
});

test("問題にできる文がなければ、作れる形を案内する", async ({ page }) => {
  const cards = await openGenerator(page);
  await cards.getByLabel("文章を貼り付け").fill("今日は晴れです。明日も晴れるといい。");
  await cards.getByRole("button", { name: "候補をつくる" }).click();
  await expect(cards.getByRole("alert")).toContainText("問題にできる文が見つかりませんでした。");
  await expect(cards.getByText("作れる形", { exact: true })).toBeVisible();
});

test("書式どおりの取り込みは、これまでどおり使える", async ({ page }) => {
  await openFirstTime(page, "/cards");
  const cards = screen(page);
  await expect(
    cards.getByRole("group", { name: "取り込みかた" }).getByRole("button", { name: "書式どおり" }),
  ).toHaveAttribute("aria-pressed", "true");
  await cards.getByLabel("文章を貼り付け").fill("Q: 首都は？\nA: 東京");
  await cards.getByRole("button", { name: "候補をつくる" }).click();
  await expect(cards.getByLabel("候補1の答え")).toHaveValue("東京");
  await expect(cards.getByText(/^元の文：/)).toHaveCount(0);
});
