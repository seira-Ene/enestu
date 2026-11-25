import { describe, expect, it } from "vitest";
import {
  accountLabel,
  decideOwner,
  describeCounts,
  hasRecords,
  parseAccount,
  toAccountState,
  type OwnerClues,
} from "./account";

const ALICE = "11111111-1111-4111-8111-111111111111";
const BOB = "22222222-2222-4222-8222-222222222222";
const DEVICE = "33333333-3333-4333-8333-333333333333";

describe("parseAccount", () => {
  const claims = {
    sub: ALICE,
    role: "authenticated",
    email: "a@example.com",
    user_metadata: { full_name: "山田 花子", name: "別名" },
  };

  it("利用者のID・名前・メールを読み取る", () => {
    expect(parseAccount(claims)).toEqual({
      id: ALICE,
      name: "山田 花子",
      email: "a@example.com",
    });
  });

  it("full_name がなければ name を使う", () => {
    expect(
      parseAccount({ ...claims, user_metadata: { name: "花子" } })?.name,
    ).toBe("花子");
  });

  it.each([
    ["ない", undefined],
    ["null", null],
    ["文字列", "山田"],
    ["数値の名前", { full_name: 1 }],
    ["空の名前", { full_name: "  " }],
    ["制御文字のある名前", { full_name: "a\tb" }],
    ["長すぎる名前", { full_name: "あ".repeat(255) }],
  ])("プロフィールが「%s」なら、名前なしにする", (_label, profile) => {
    expect(parseAccount({ ...claims, user_metadata: profile })).toEqual({
      id: ALICE,
      name: null,
      email: "a@example.com",
    });
  });

  it("メールがなくても読み取れる", () => {
    expect(parseAccount({ ...claims, email: undefined })?.email).toBeNull();
  });

  it.each([
    ["null", null],
    ["文字列", "claims"],
    ["空", {}],
    ["UUIDでないID", { ...claims, sub: "alice" }],
    ["利用者でない権限", { ...claims, role: "service_role" }],
    ["権限なし", { ...claims, role: undefined }],
    ["匿名", { ...claims, is_anonymous: true }],
  ])("「%s」なら利用者として扱わない", (_label, value) => {
    expect(parseAccount(value)).toBeNull();
  });
});

describe("accountLabel", () => {
  it.each([
    ["花子", "a@example.com", "花子"],
    [null, "a@example.com", "a@example.com"],
    [null, null, "名前のないアカウント"],
  ])("名前 %s・メール %s なら「%s」", (name, email, label) => {
    expect(accountLabel({ id: ALICE, name, email })).toBe(label);
  });
});

describe("記録の件数", () => {
  it.each([
    [3, 6, 10, "そら", "学習3件・カード6枚・解答10件・名前「そら」"],
    [3, 0, 0, null, "学習3件"],
    [0, 1, 0, null, "カード1枚"],
    [0, 0, 2, null, "解答2件"],
    [0, 0, 0, "そら", "名前「そら」"],
    [0, 0, 0, null, "なし"],
  ])(
    "学習%i・カード%i・解答%i・名前%s は「%s」",
    (studyLogs, cards, answers, heroName, text) => {
      const counts = { studyLogs, cards, answers, heroName };
      expect(describeCounts(counts)).toBe(text);
      expect(hasRecords(counts)).toBe(text !== "なし");
    },
  );
});

describe("toAccountState", () => {
  const account = { id: ALICE, name: "花子", email: null };
  const claimable = { studyLogs: 1, cards: 0, answers: 0, heroName: null };

  it("画面とサーバーが一致すれば、そのままの状態", () => {
    expect(toAccountState(null, null, null)).toEqual({ kind: "guest" });
    expect(toAccountState(ALICE, account, claimable)).toEqual({
      kind: "signed_in",
      account,
      claimable,
    });
  });

  it("ログイン中のはずが切れていたら、未ログインにしない", () => {
    expect(toAccountState(ALICE, null, null)).toEqual({ kind: "expired" });
  });

  it("別の人や、未ログインのはずがログイン中なら、変わったと伝える", () => {
    const changed = { kind: "changed" };
    expect(toAccountState(BOB, account, claimable)).toEqual(changed);
    expect(toAccountState(null, account, claimable)).toEqual(changed);
  });
});

describe("decideOwner", () => {
  const decide = (clues: Partial<OwnerClues>) =>
    decideOwner({
      accountId: null,
      deviceId: DEVICE,
      sessionUserId: null,
      ...clues,
    });

  it("未ログインなら端末のもの", () => {
    expect(decide({})).toEqual({ kind: "device", id: DEVICE });
  });

  it("ログイン中なら利用者のもの", () => {
    const user = { kind: "user", id: ALICE };
    expect(decide({ accountId: ALICE, sessionUserId: ALICE })).toEqual(user);
    expect(
      decide({ accountId: ALICE, sessionUserId: ALICE, deviceId: null }),
    ).toEqual(user);
  });

  it("IDの大文字と小文字を区別しない", () => {
    const id = "abcdefab-cdef-4bcd-8bcd-abcdefabcdef";
    expect(
      decide({ accountId: id.toUpperCase(), sessionUserId: id }),
    ).toEqual({ kind: "user", id });
  });

  it("ログインが切れていたら、端末のものにしない", () => {
    expect(decide({ accountId: ALICE })).toEqual({ kind: "signed_out" });
  });

  it("画面の認識と違う人や、未ログインの画面からは受け付けない", () => {
    const changed = { kind: "account_changed" };
    expect(decide({ accountId: ALICE, sessionUserId: BOB })).toEqual(changed);
    expect(decide({ sessionUserId: ALICE })).toEqual(changed);
  });

  it.each([null, "", "device"])("端末ID「%s」は拒否する", (deviceId) => {
    expect(decide({ deviceId }).kind).toBe("invalid");
  });

  it.each(["", "alice"])(
    "利用者ID「%s」は、端末のものにせず拒否する",
    (accountId) => {
      expect(decide({ accountId }).kind).toBe("invalid");
      expect(decide({ accountId, sessionUserId: ALICE }).kind).toBe("invalid");
    },
  );
});
