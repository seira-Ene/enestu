import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  ROW_LIMIT_MESSAGE,
  ROW_LIMITS,
  type LimitedTable,
} from "@/domain/limits";
import { TestDb, type Actor } from "./test-db";

/** 持ち主ごとの件数の上限が、決めた値で効くことを確かめる。 */

let db: TestDb;

beforeAll(async () => {
  db = await TestDb.create();
});

beforeEach(async () => {
  await db.clear();
});

afterAll(async () => {
  await db.close();
});

type OwnerColumn = "device_id" | "user_id";

/** 上限を確かめる表。ガチャの上限は専用のトリガーなので、gacha.test.ts で確かめる。 */
type Table = LimitedTable;

/** 1行を入れるための列と値。$1 は持ち主、$2 は親（カードか用語）。 */
const TABLES: Record<
  Table,
  { columns: string; values: string; parent?: "card" | "term" }
> = {
  quiz_cards: { columns: "subject, question, answer", values: "'s', 'q', 'a'" },
  explain_terms: { columns: "subject, term, keywords", values: "'s', 't', '{k}'" },
  study_logs: {
    columns: "subject, started_at, ended_at",
    values: "'s', now() - interval '2 hours', now() - interval '1 hour'",
  },
  answer_logs: {
    columns: "card_id, user_answer, is_correct, answered_at",
    values: "$2, 'x', true, now()",
    parent: "card",
  },
  explanation_logs: {
    columns: "term_id, body, total_count, missing, explained_at",
    values: "$2, 'b', 1, '{}', now()",
    parent: "term",
  },
};

type Owner = { column: OwnerColumn; id: string; parent?: string };

/** 解答と説明は、同じ持ち主のカードか用語が要る。 */
async function ownerFor(
  table: Table,
  column: OwnerColumn,
  id: string,
): Promise<Owner> {
  const kind = TABLES[table].parent;
  if (kind === undefined) return { column, id };
  const parent = randomUUID();
  const sql =
    kind === "card"
      ? `insert into quiz_cards (id, ${column}, subject, question, answer)
         values ($1, $2, 's', 'q', 'a')`
      : `insert into explain_terms (id, ${column}, subject, term, keywords)
         values ($1, $2, 's', 't', '{k}')`;
  await db.asOwner(sql, [parent, id]);
  return { column, id, parent };
}

const params = (owner: Owner) =>
  owner.parent === undefined ? [owner.id] : [owner.id, owner.parent];

/** 上限を通さずに n 件を入れる。hoursAgo で、作った時刻を過去にする。 */
async function fill(
  table: Table,
  owner: Owner,
  n: number,
  hoursAgo = 0,
): Promise<void> {
  const { columns, values } = TABLES[table];
  await db.asOwner(`alter table ${table} disable trigger ${table}_limit`);
  try {
    await db.asOwner(
      `insert into ${table} (id, ${owner.column}, ${columns}, created_at)
       select gen_random_uuid(), $1, ${values}, now() - interval '${hoursAgo} hours'
       from generate_series(1, ${n})`,
      params(owner),
    );
  } finally {
    await db.asOwner(`alter table ${table} enable trigger ${table}_limit`);
  }
}

/** rows 件を一度に入れる。失敗したら、その理由を返す。 */
async function insert(
  table: Table,
  owner: Owner,
  {
    actor = "service_role",
    id,
    rows = 1,
  }: { actor?: Actor; id?: string; rows?: number } = {},
): Promise<string | null> {
  const { columns, values } = TABLES[table];
  const ownerParams = params(owner);
  const idParam = `$${ownerParams.length + 1}`;
  const sql =
    id === undefined
      ? `insert into ${table} (id, ${owner.column}, ${columns})
         select gen_random_uuid(), $1, ${values} from generate_series(1, ${rows})`
      : `insert into ${table} (id, ${owner.column}, ${columns})
         values (${idParam}, $1, ${values}) on conflict (id) do nothing`;
  try {
    await db.as(actor, sql, id === undefined ? ownerParams : [...ownerParams, id]);
    return null;
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }
}

const count = async (table: Table, owner: Owner) =>
  Number(
    (
      await db.asOwner(
        `select count(*) as n from ${table} where ${owner.column} = $1`,
        [owner.id],
      )
    )[0]?.n,
  );

const tables = Object.keys(TABLES) as Table[];

describe("上限", () => {
  it.each(tables)("%s は、上限ちょうどまで入り、超えると止まる", async (table) => {
    const limit = ROW_LIMITS[table].count;
    const owner = await ownerFor(table, "device_id", randomUUID());
    await fill(table, owner, limit - 1);

    expect(await insert(table, owner)).toBeNull();
    expect(await insert(table, owner)).toBe(ROW_LIMIT_MESSAGE);
    expect(await count(table, owner)).toBe(limit);
  });

  it("まとめて入れて超えるときは、1件も入らない", async () => {
    const limit = ROW_LIMITS.quiz_cards.count;
    const owner = await ownerFor("quiz_cards", "device_id", randomUUID());
    await fill("quiz_cards", owner, limit - 2);

    expect(await insert("quiz_cards", owner, { rows: 5 })).toBe(
      ROW_LIMIT_MESSAGE,
    );
    expect(await count("quiz_cards", owner)).toBe(limit - 2);
  });

  it("持ち主ごとに数え、他の人や端末の分は数えない", async () => {
    const limit = ROW_LIMITS.quiz_cards.count;
    const alice = await db.createUser();
    const bob = await db.createUser();
    const aliceOwner = await ownerFor("quiz_cards", "user_id", alice);
    await fill("quiz_cards", aliceOwner, limit);

    // 同じIDの端末でも、利用者とは別に数える。
    const device = await ownerFor("quiz_cards", "device_id", alice);
    expect(await insert("quiz_cards", device)).toBeNull();
    await fill("quiz_cards", device, limit - 1);
    expect(await insert("quiz_cards", device)).toBe(ROW_LIMIT_MESSAGE);
    // 端末は秘密の鍵で書くので、他の端末の行も見える。それでも数えない。
    const otherDevice = await ownerFor("quiz_cards", "device_id", randomUUID());
    expect(await insert("quiz_cards", otherDevice)).toBeNull();
    const bobOwner = await ownerFor("quiz_cards", "user_id", bob);
    expect(await insert("quiz_cards", bobOwner, { actor: { user: bob } })).toBeNull();
    expect(
      await insert("quiz_cards", aliceOwner, { actor: { user: alice } }),
    ).toBe(ROW_LIMIT_MESSAGE);
  });

  it("24時間で数えるものは、それより前の分を数えない", async () => {
    const limit = ROW_LIMITS.study_logs.count;
    const owner = await ownerFor("study_logs", "device_id", randomUUID());
    await fill("study_logs", owner, limit, 25);
    await fill("study_logs", owner, limit - 1, 23);

    expect(await insert("study_logs", owner)).toBeNull();
    expect(await insert("study_logs", owner)).toBe(ROW_LIMIT_MESSAGE);
  });

  it("全期間で数えるものは、古い分も数える", async () => {
    const limit = ROW_LIMITS.explain_terms.count;
    const owner = await ownerFor("explain_terms", "device_id", randomUUID());
    await fill("explain_terms", owner, limit, 24 * 365);

    expect(await insert("explain_terms", owner)).toBe(ROW_LIMIT_MESSAGE);
  });

  it("上限に達していても、同じ行の送り直しは止めない", async () => {
    const limit = ROW_LIMITS.study_logs.count;
    const owner = await ownerFor("study_logs", "device_id", randomUUID());
    await fill("study_logs", owner, limit - 1);
    const id = randomUUID();
    expect(await insert("study_logs", owner, { id })).toBeNull();

    expect(await insert("study_logs", owner, { id })).toBeNull();
    expect(await count("study_logs", owner)).toBe(limit);
  });
});

describe("設定", () => {
  it("トリガーの値が、src/domain/limits.ts と同じ", async () => {
    const rows = await db.asOwner(
      `select c.relname as table, pg_get_triggerdef(t.oid) as def
       from pg_trigger t join pg_class c on c.oid = t.tgrelid
       where t.tgfoid = 'public.enforce_row_limit()'::regprocedure`,
    );
    const actual = Object.fromEntries(
      rows.map((row) => {
        const args = /enforce_row_limit\('(\d+)', '([^']*)'\)/.exec(
          String(row.def),
        );
        return [String(row.table), [Number(args?.[1]), args?.[2]]];
      }),
    );
    const expected = Object.fromEntries(
      (Object.keys(ROW_LIMITS) as LimitedTable[]).map((table) => [
        table,
        [ROW_LIMITS[table].count, ROW_LIMITS[table].perDay ? "1 day" : ""],
      ]),
    );
    expect(actual).toEqual(expected);
  });
});
