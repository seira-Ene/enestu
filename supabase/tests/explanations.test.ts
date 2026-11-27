import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  MAX_EXPLANATION_LENGTH,
  MAX_KEYWORD_LENGTH,
  MAX_KEYWORDS,
  MAX_TERM_LENGTH,
} from "@/domain/explanation-input";
import { SQLSTATE, TestDb, type Actor } from "./test-db";

/** 用語と説明が、持ち主のほかに見えず、他人の用語に記録できないことを確かめる。 */

let db: TestDb;
let alice: string;
let bob: string;
let device: string;

beforeAll(async () => {
  db = await TestDb.create();
});

beforeEach(async () => {
  await db.clear();
  alice = await db.createUser();
  bob = await db.createUser();
  device = randomUUID();
});

afterAll(async () => {
  await db.close();
});

type OwnerColumn = "device_id" | "user_id";

const termSql = (column: OwnerColumn) =>
  `insert into explain_terms (id, ${column}, subject, term, keywords)
   values ($1, $2, $3, $4, $5)`;
const logSql = (column: OwnerColumn) =>
  `insert into explanation_logs
     (id, ${column}, term_id, body, total_count, missing, explained_at)
   values (gen_random_uuid(), $1, $2, $3, $4, $5, now())`;

async function addTerm(
  actor: Actor,
  column: OwnerColumn,
  owner: string,
): Promise<string> {
  const id = randomUUID();
  await db.as(actor, termSql(column), [id, owner, "数学", "固有値", ["向き"]]);
  return id;
}

const aliceTerm = () => addTerm({ user: alice }, "user_id", alice);
const bobTerm = () => addTerm({ user: bob }, "user_id", bob);
const deviceTerm = () => addTerm("service_role", "device_id", device);

const explain = (
  actor: Actor,
  column: OwnerColumn,
  owner: string,
  termId: string,
  {
    body = "説明",
    total = 2,
    missing = ["x"],
  }: { body?: string; total?: number; missing?: (string | null)[] } = {},
) => db.errorCode(actor, logSql(column), [owner, termId, body, total, missing]);

describe("読み取り", () => {
  it("用語も説明も、本人のものだけが見える", async () => {
    await explain({ user: alice }, "user_id", alice, await aliceTerm());
    await explain({ user: bob }, "user_id", bob, await bobTerm());
    await explain("service_role", "device_id", device, await deviceTerm());
    for (const table of ["explain_terms", "explanation_logs"]) {
      expect(
        await db.as({ user: alice }, `select user_id from ${table}`),
      ).toEqual([{ user_id: alice }]);
      expect(
        await db.as("authenticated", `select user_id from ${table}`),
      ).toEqual([]);
    }
  });
});

describe("用語", () => {
  const add = (subject: string, term: string, keywords: (string | null)[]) =>
    db.errorCode({ user: alice }, termSql("user_id"), [
      randomUUID(),
      alice,
      subject,
      term,
      keywords,
    ]);

  it("アプリの上限まで受け付ける", async () => {
    expect(
      await add(
        "数学",
        "あ".repeat(MAX_TERM_LENGTH),
        Array.from({ length: MAX_KEYWORDS }, () =>
          "あ".repeat(MAX_KEYWORD_LENGTH),
        ),
      ),
    ).toBeNull();
  });

  it.each([
    ["空の科目", " ", "用語", ["観点"]],
    ["空の用語", "数学", " ", ["観点"]],
    ["長い用語", "数学", "あ".repeat(MAX_TERM_LENGTH + 1), ["観点"]],
    ["観点なし", "数学", "用語", []],
    ["空の観点", "数学", "用語", ["観点", ""]],
    ["nullの観点", "数学", "用語", ["観点", null]],
    [
      "多すぎる観点",
      "数学",
      "用語",
      Array.from({ length: MAX_KEYWORDS + 1 }, () => "x"),
    ],
    [
      "長すぎる観点",
      "数学",
      "用語",
      ["あ".repeat(MAX_KEYWORDS * MAX_KEYWORD_LENGTH + 1)],
    ],
  ])("%s は拒否する", async (_label, subject, term, keywords) => {
    expect(await add(subject, term, keywords)).toBe(SQLSTATE.checkViolation);
  });

  it("他人や端末のものとしては登録できない", async () => {
    for (const [column, owner] of [
      ["user_id", bob],
      ["device_id", device],
    ] as const) {
      expect(
        await db.errorCode({ user: alice }, termSql(column), [
          randomUUID(),
          owner,
          "数学",
          "用語",
          ["観点"],
        ]),
      ).toBe(SQLSTATE.permissionDenied);
    }
  });

  it.each(["explain_terms", "explanation_logs"])(
    "%s は、持ち主なしと、二重の持ち主を拒否する",
    async (table) => {
      await explain({ user: alice }, "user_id", alice, await aliceTerm());
      for (const values of [
        "user_id = null",
        "device_id = gen_random_uuid()",
      ]) {
        await expect(
          db.asOwner(`update ${table} set ${values}`),
        ).rejects.toMatchObject({ code: SQLSTATE.checkViolation });
      }
    },
  );

  it("自分の用語だけ直せて、持ち主は変えられない", async () => {
    const id = await aliceTerm();
    const others = await bobTerm();
    const as: Actor = { user: alice };
    const update =
      "update explain_terms set term = '新', archived_at = now() where id = $1 returning id";
    expect(await db.as(as, update, [id])).toEqual([{ id }]);
    expect(await db.as(as, update, [others])).toEqual([]);
    for (const actor of [as, "service_role"] as const) {
      for (const column of ["id", "device_id", "user_id", "created_at"]) {
        expect(
          await db.errorCode(
            actor,
            `update explain_terms set ${column} = ${column}`,
          ),
        ).toBe(SQLSTATE.permissionDenied);
      }
    }
  });
});

describe("説明", () => {
  it("自分の用語にだけ記録できる", async () => {
    const mine = await aliceTerm();
    const others = await bobTerm();
    const guests = await deviceTerm();
    const as: Actor = { user: alice };
    expect(await explain(as, "user_id", alice, mine)).toBeNull();
    expect(
      await explain("service_role", "device_id", device, guests),
    ).toBeNull();
    for (const term of [others, guests, randomUUID()]) {
      expect(await explain(as, "user_id", alice, term)).toBe(
        SQLSTATE.foreignKeyViolation,
      );
    }
    for (const [owner, term] of [
      [device, mine],
      [randomUUID(), guests],
    ] as const) {
      expect(await explain("service_role", "device_id", owner, term)).toBe(
        SQLSTATE.foreignKeyViolation,
      );
    }
    expect(await explain(as, "user_id", bob, others)).toBe(
      SQLSTATE.permissionDenied,
    );
  });

  it("上限の長さと、足りない観点なしを受け付ける", async () => {
    expect(
      await explain({ user: alice }, "user_id", alice, await aliceTerm(), {
        body: "あ".repeat(MAX_EXPLANATION_LENGTH),
        missing: [],
      }),
    ).toBeNull();
  });

  it.each([
    ["空の説明", { body: " \n " }],
    ["長い説明", { body: "あ".repeat(MAX_EXPLANATION_LENGTH + 1) }],
    ["観点0個", { total: 0, missing: [] }],
    ["観点が多すぎる", { total: MAX_KEYWORDS + 1, missing: [] }],
    ["足りない観点が多すぎる", { total: 1, missing: ["a", "b"] }],
    ["nullの観点", { missing: [null] }],
  ])("%s は拒否する", async (_label, values) => {
    expect(
      await explain(
        { user: alice },
        "user_id",
        alice,
        await aliceTerm(),
        values,
      ),
    ).toBe(SQLSTATE.checkViolation);
  });

  it("記録した説明は、書き換えられない", async () => {
    await explain({ user: alice }, "user_id", alice, await aliceTerm());
    for (const actor of [{ user: alice }, "service_role"] as const) {
      expect(
        await db.errorCode(actor, "update explanation_logs set body = 'x'"),
      ).toBe(SQLSTATE.permissionDenied);
    }
  });
});

describe("引き継ぎと、利用者の削除", () => {
  const claim = (user: string) =>
    db.as(
      "service_role",
      `select terms::int, explanations::int
       from claim_device_records($1, $2)`,
      [device, user],
    );
  const owned = (column: OwnerColumn, id: string) =>
    db.asOwner(
      `select
         (select count(*)::int from explain_terms where ${column} = $1) as terms,
         (select count(*)::int from explanation_logs where ${column} = $1) as logs`,
      [id],
    );

  it("用語と説明が移り、隠した用語は件数に入れない", async () => {
    const term = await deviceTerm();
    await explain("service_role", "device_id", device, term);
    await explain("service_role", "device_id", device, term);
    const hidden = await deviceTerm();
    await db.asOwner(
      "update explain_terms set archived_at = now() where id = $1",
      [hidden],
    );
    expect(await claim(alice)).toEqual([{ terms: 1, explanations: 2 }]);
    expect(await owned("user_id", alice)).toEqual([{ terms: 2, logs: 2 }]);
    expect(await owned("device_id", device)).toEqual([{ terms: 0, logs: 0 }]);
    expect(await claim(bob)).toEqual([{ terms: 0, explanations: 0 }]);
  });

  it("利用者を消すと、その人のものだけが消える", async () => {
    await explain({ user: alice }, "user_id", alice, await aliceTerm());
    await explain({ user: bob }, "user_id", bob, await bobTerm());
    await db.asOwner("delete from auth.users where id = $1", [alice]);
    expect(await owned("user_id", alice)).toEqual([{ terms: 0, logs: 0 }]);
    expect(await owned("user_id", bob)).toEqual([{ terms: 1, logs: 1 }]);
  });
});
