import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AI_DAILY_LIMIT } from "@/domain/ai-key";
import { SQLSTATE, TestDb, type Actor } from "./test-db";

/** AIのキーは、本人が暗号文を読めず、他人に触れられないこと。AIの回数は1日の上限で止まること。 */

let db: TestDb;
let alice: string;
let bob: string;

beforeAll(async () => {
  db = await TestDb.create();
});

beforeEach(async () => {
  await db.clear();
  alice = await db.createUser();
  bob = await db.createUser();
});

afterAll(async () => {
  await db.close();
});

const SEALED = `v1.${"x".repeat(40)}`;

async function message(actor: Actor, sql: string, params: unknown[] = []) {
  try {
    await db.as(actor, sql, params);
    return null;
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }
}

const saveKey = (actor: Actor, owner: string, last4 = "abcd") =>
  db.errorCode(
    actor,
    `insert into ai_keys (user_id, provider, ciphertext, last4)
     values ($1, 'gemini', $2, $3)`,
    [owner, SEALED, last4],
  );

describe("AIのキー", () => {
  it("本人は登録でき、種類と末尾4文字は読めるが、暗号文は読めない", async () => {
    expect(await saveKey({ user: alice }, alice)).toBeNull();
    expect(
      await db.as({ user: alice }, "select provider, last4 from ai_keys"),
    ).toEqual([{ provider: "gemini", last4: "abcd" }]);
    for (const sql of ["select ciphertext from ai_keys", "select * from ai_keys"]) {
      expect(await db.errorCode({ user: alice }, sql)).toBe(SQLSTATE.permissionDenied);
    }
  });

  it("AIを呼ぶときの secret key だけが、暗号文を読める", async () => {
    await saveKey({ user: alice }, alice);
    expect(
      await db.as("service_role", "select ciphertext from ai_keys where user_id = $1", [alice]),
    ).toEqual([{ ciphertext: SEALED }]);
    expect(await db.errorCode("anon", "select last4 from ai_keys")).toBe(
      SQLSTATE.permissionDenied,
    );
  });

  it("他人のキーは、登録も、見ることも、消すこともできない", async () => {
    expect(await message({ user: alice }, `insert into ai_keys (user_id, provider, ciphertext, last4) values ($1, 'gemini', $2, 'abcd')`, [bob, SEALED])).toMatch(/row-level security/);
    await saveKey({ user: bob }, bob);
    expect(await db.as({ user: alice }, "select last4 from ai_keys")).toEqual([]);
    await db.as({ user: alice }, "delete from ai_keys");
    expect(await db.asOwner("select count(*)::int as n from ai_keys")).toEqual([{ n: 1 }]);
  });

  it("本人は、キーを替えて、消せる", async () => {
    await saveKey({ user: alice }, alice);
    expect(
      await db.as(
        { user: alice },
        "update ai_keys set ciphertext = $1, last4 = 'wxyz' where user_id = $2 returning last4",
        [`v1.${"y".repeat(40)}`, alice],
      ),
    ).toEqual([{ last4: "wxyz" }]);
    expect(
      await db.as({ user: alice }, "delete from ai_keys where user_id = $1 returning user_id", [alice]),
    ).toEqual([{ user_id: alice }]);
  });

  it("サービスの種類と、末尾4文字の形を確かめる", async () => {
    expect(
      await db.errorCode(
        { user: alice },
        "insert into ai_keys (user_id, provider, ciphertext, last4) values ($1, 'openai', $2, 'abcd')",
        [alice, SEALED],
      ),
    ).toBe(SQLSTATE.checkViolation);
    expect(await saveKey({ user: alice }, alice, "abc")).toBe(SQLSTATE.checkViolation);
  });

  it("利用者を消すと、キーも消える", async () => {
    await saveKey({ user: alice }, alice);
    await db.asOwner("delete from auth.users where id = $1", [alice]);
    expect(await db.asOwner("select count(*)::int as n from ai_keys")).toEqual([{ n: 0 }]);
  });
});

describe("AIを呼んだ記録", () => {
  const record = (actor: Actor, owner: string) =>
    message(actor, "insert into ai_requests (user_id, kind) values ($1, 'cards')", [owner]);

  it(`1人1日${AI_DAILY_LIMIT}回まで。他の人は数えない`, async () => {
    for (let count = 0; count < AI_DAILY_LIMIT; count += 1) {
      expect(await record({ user: alice }, alice)).toBeNull();
    }
    expect(await record({ user: alice }, alice)).toBe("row_limit");
    expect(await record({ user: bob }, bob)).toBeNull();
  });

  it("24時間たった分は、数えない", async () => {
    for (let count = 0; count < AI_DAILY_LIMIT; count += 1) await record({ user: alice }, alice);
    await db.asOwner(
      `update ai_requests set created_at = now() - interval '25 hours'
       where id = (select min(id) from ai_requests)`,
    );
    expect(await record({ user: alice }, alice)).toBeNull();
  });

  it("時刻を指定したり、他人の分を足したり、消したりはできない", async () => {
    expect(
      await db.errorCode(
        { user: alice },
        "insert into ai_requests (user_id, kind, created_at) values ($1, 'cards', now() - interval '2 days')",
        [alice],
      ),
    ).toBe(SQLSTATE.permissionDenied);
    expect(await record({ user: alice }, bob)).toMatch(/row-level security/);
    await record({ user: alice }, alice);
    expect(await db.errorCode({ user: alice }, "delete from ai_requests")).toBe(
      SQLSTATE.permissionDenied,
    );
  });
});
