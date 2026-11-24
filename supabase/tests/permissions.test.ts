import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SQLSTATE, TestDb, type Role } from "./test-db";

let db: TestDb;

beforeAll(async () => {
  db = await TestDb.create();
});

afterAll(async () => {
  await db.close();
});

const ACTIONS = ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE"] as const;

/** テーブル単位で許す操作。書いていないものは、すべて拒否されるべき。 */
const TABLE_PRIVILEGES: Readonly<
  Record<string, Partial<Record<Role, readonly string[]>>>
> = {
  study_logs: { service_role: ["SELECT", "INSERT"] },
  quiz_cards: { service_role: ["SELECT", "INSERT"] },
  answer_logs: { service_role: ["SELECT", "INSERT"] },
  user_settings: { service_role: ["SELECT", "INSERT", "UPDATE"] },
};

/** 列だけに許す更新。 */
const COLUMN_UPDATES: Readonly<
  Record<string, Partial<Record<Role, readonly string[]>>>
> = {
  quiz_cards: {
    service_role: ["answer", "archived_at", "question", "subject"],
  },
};

/** 関数を実行できるロール。 */
const FUNCTION_ROLES: Readonly<Record<string, readonly Role[]>> = {
  subject_stats: ["service_role"],
  progress_totals: ["service_role"],
};

const ROLES: readonly Role[] = ["anon", "authenticated", "service_role"];

describe("テーブル", () => {
  it("検査の一覧に、すべてのテーブルが載っている", async () => {
    const rows = await db.asOwner(
      "select tablename from pg_tables where schemaname = 'public' order by 1",
    );
    expect(rows.map((row) => row.tablename)).toEqual(
      Object.keys(TABLE_PRIVILEGES).sort(),
    );
  });

  it("すべてのテーブルでRLSが有効", async () => {
    const rows = await db.asOwner(
      `select c.relname from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind in ('r', 'p')
         and not c.relrowsecurity`,
    );
    expect(rows).toEqual([]);
  });

  it.each(
    Object.keys(TABLE_PRIVILEGES).flatMap((table) =>
      ROLES.map((role) => [table, role] as const),
    ),
  )("%s への %s の権限が、決めたとおり", async (table, role) => {
    const granted: string[] = [];
    for (const action of ACTIONS) {
      const [row] = await db.asOwner(
        "select has_table_privilege($1, $2, $3) as ok",
        [role, `public.${table}`, action],
      );
      if (row?.ok === true) granted.push(action);
    }
    expect(granted).toEqual(TABLE_PRIVILEGES[table]?.[role] ?? []);
  });

  it.each(
    Object.keys(TABLE_PRIVILEGES).flatMap((table) =>
      ROLES.map((role) => [table, role] as const),
    ),
  )("%s で %s が更新できる列が、決めたとおり", async (table, role) => {
    if (TABLE_PRIVILEGES[table]?.[role]?.includes("UPDATE")) return;
    const rows = await db.asOwner(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = $1
         and has_column_privilege($2, 'public.' || $1, column_name, 'UPDATE')
       order by 1`,
      [table, role],
    );
    expect(rows.map((row) => row.column_name)).toEqual(
      COLUMN_UPDATES[table]?.[role] ?? [],
    );
  });
});

describe("関数", () => {
  it("検査の一覧に、すべての関数が載っている", async () => {
    const rows = await db.asOwner(
      `select p.proname from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' order by 1`,
    );
    expect(rows.map((row) => row.proname)).toEqual(
      Object.keys(FUNCTION_ROLES).sort(),
    );
  });

  it.each(Object.keys(FUNCTION_ROLES))(
    "%s を実行できるロールが、決めたとおり",
    async (name) => {
      const allowed: Role[] = [];
      for (const role of ROLES) {
        const [row] = await db.asOwner(
          `select has_function_privilege($1, p.oid, 'EXECUTE') as ok
           from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = $2`,
          [role, name],
        );
        if (row?.ok === true) allowed.push(role);
      }
      expect(allowed).toEqual(FUNCTION_ROLES[name]);
    },
  );

  it("参照先を乗っ取られないよう、search_path を固定している", async () => {
    const rows = await db.asOwner(
      `select p.proname from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
         and not coalesce(p.proconfig, '{}') && array['search_path=""']`,
    );
    expect(rows).toEqual([]);
  });
});

describe("実際の操作", () => {
  it.each(["anon", "authenticated"] as const)(
    "%s は、どのテーブルも読み書きできない",
    async (role) => {
      for (const table of Object.keys(TABLE_PRIVILEGES)) {
        for (const sql of [
          `select * from public.${table}`,
          `delete from public.${table}`,
          `insert into public.${table} default values`,
        ]) {
          expect(await db.errorCode(role, sql)).toBe(SQLSTATE.permissionDenied);
        }
      }
    },
  );
});
