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
  study_logs: {
    authenticated: ["SELECT", "INSERT"],
    service_role: ["SELECT", "INSERT"],
  },
  quiz_cards: {
    authenticated: ["SELECT", "INSERT"],
    service_role: ["SELECT", "INSERT"],
  },
  answer_logs: {
    authenticated: ["SELECT", "INSERT"],
    service_role: ["SELECT", "INSERT"],
  },
  user_settings: {
    authenticated: ["SELECT", "INSERT"],
    service_role: ["SELECT", "INSERT", "UPDATE"],
  },
  notes: { authenticated: ["SELECT", "DELETE"] },
  explain_terms: {
    authenticated: ["SELECT", "INSERT"],
    service_role: ["SELECT", "INSERT"],
  },
  explanation_logs: {
    authenticated: ["SELECT", "INSERT"],
    service_role: ["SELECT", "INSERT"],
  },
  // ガチャの記録は、引く関数の中でだけ足す。景品の表は誰にも見せない。
  gacha_pulls: { authenticated: ["SELECT"], service_role: ["SELECT"] },
  // 受け取りの記録も、受け取る関数の中でだけ足す。
  daily_claims: { authenticated: ["SELECT"], service_role: ["SELECT"] },
  gacha_items: {},
  gacha_rarities: {},
};

/** 列だけに許す追加。 */
const COLUMN_INSERTS: Readonly<
  Record<string, Partial<Record<Role, readonly string[]>>>
> = {
  notes: { authenticated: ["body", "has_image", "id", "user_id"] },
};

/** 列だけに許す更新。 */
const COLUMN_UPDATES: Readonly<
  Record<string, Partial<Record<Role, readonly string[]>>>
> = {
  quiz_cards: {
    authenticated: ["answer", "archived_at", "question", "subject"],
    service_role: ["answer", "archived_at", "question", "subject"],
  },
  user_settings: {
    authenticated: ["hero_name", "updated_at", "user_id", "world_id"],
  },
  notes: { authenticated: ["image_uploaded_at"] },
  explain_terms: {
    authenticated: ["archived_at", "keywords", "subject", "term"],
    service_role: ["archived_at", "keywords", "subject", "term"],
  },
};

/** RLSのポリシーの条件は、どのテーブルも「ログインした本人の行だけ」。 */
const OWN_ROWS = "(user_id = ( SELECT auth.uid() AS uid))";

/** 操作ごとのポリシー。書いていないテーブルは、全操作をまとめた1つ。 */
const POLICY_COMMANDS: Readonly<Record<string, readonly string[]>> = {
  notes: ["DELETE", "INSERT", "SELECT", "UPDATE"],
  // 持ち主のいない表。ポリシーを置かず、誰にも読ませない。
  gacha_items: [],
  gacha_rarities: [],
};

/** 本人が行を消せるテーブル。増やすときは理由を確かめる。 */
const DELETABLE: readonly string[] = ["notes"];

/** 関数を実行できるロール。 */
const FUNCTION_ROLES: Readonly<Record<string, readonly Role[]>> = {
  subject_stats: ["service_role"],
  progress_totals: ["service_role"],
  my_subject_stats: ["authenticated"],
  my_progress_totals: ["authenticated"],
  claim_device_records: ["service_role"],
  enforce_notes_limit: [],
  enforce_row_limit: [],
  my_gacha_status: ["authenticated"],
  my_gacha_pull: ["authenticated"],
  my_gacha_collection: ["authenticated"],
  gacha_status: ["service_role"],
  gacha_pull: ["service_role"],
  gacha_collection: ["service_role"],
  gacha_rarity_for: [],
  gacha_min_rarity: [],
  gacha_counts: [],
  gacha_draw: [],
  my_daily_status: ["authenticated"],
  my_daily_claim: ["authenticated"],
  daily_status: ["service_role"],
  daily_claim: ["service_role"],
  daily_day: [],
  daily_status_of: [],
  daily_material: [],
  daily_claim_for: [],
  notify_notes_changed: [],
};

/** 所有者の権限で動く関数。RLSを迂回するため、増やすときは理由を確かめる。 */
const SECURITY_DEFINER: readonly string[] = [
  "claim_device_records",
  // 毎日の報酬も、受け取りの記録を本人に書き換えさせないため。
  "daily_claim",
  "daily_status",
  // ガチャは、券と記録を本人に書き換えさせないため。持ち主は引数で選ばせない。
  "gacha_pull",
  "gacha_status",
  "my_daily_claim",
  "my_daily_status",
  "my_gacha_pull",
  "my_gacha_status",
  "notify_notes_changed",
];

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

  it.each(Object.keys(TABLE_PRIVILEGES))(
    "%s のポリシーは、ログインした本人の行だけを許す",
    async (table) => {
      const rows = await db.asOwner(
        `select permissive, roles::text as roles, cmd, qual, with_check
         from pg_policies where schemaname = 'public' and tablename = $1
         order by cmd`,
        [table],
      );
      expect(rows.map((row) => row.cmd)).toEqual(
        POLICY_COMMANDS[table] ?? ["ALL"],
      );
      for (const row of rows) {
        expect(row.permissive).toBe("PERMISSIVE");
        expect(row.roles).toBe("{authenticated}");
        const { cmd, qual, with_check: check } = row;
        // 削除は、本人の行であることに加えて条件を足してよい。
        if (cmd === "DELETE") expect(qual).toContain(`(${OWN_ROWS} AND `);
        else if (cmd !== "INSERT") expect(qual).toBe(OWN_ROWS);
        if (["ALL", "INSERT", "UPDATE"].includes(String(cmd))) {
          expect(check).toBe(OWN_ROWS);
        }
      }
    },
  );

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

describe("列ごとの追加", () => {
  it.each(
    Object.keys(TABLE_PRIVILEGES).flatMap((table) =>
      ROLES.map((role) => [table, role] as const),
    ),
  )("%s で %s が追加できる列が、決めたとおり", async (table, role) => {
    if (TABLE_PRIVILEGES[table]?.[role]?.includes("INSERT")) return;
    const rows = await db.asOwner(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = $1
         and has_column_privilege($2, 'public.' || $1, column_name, 'INSERT')
       order by 1`,
      [table, role],
    );
    expect(rows.map((row) => row.column_name)).toEqual(
      COLUMN_INSERTS[table]?.[role] ?? [],
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

  it("所有者の権限で動く関数が、決めたものだけ", async () => {
    const rows = await db.asOwner(
      `select p.proname from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.prosecdef order by 1`,
    );
    expect(rows.map((row) => row.proname)).toEqual(SECURITY_DEFINER);
  });

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
  it.each(Object.keys(TABLE_PRIVILEGES))(
    "未ログインでは、%s を読み書きできない",
    async (table) => {
      for (const sql of [
        `select * from public.${table}`,
        `delete from public.${table}`,
        `insert into public.${table} default values`,
      ]) {
        expect(await db.errorCode("anon", sql)).toBe(SQLSTATE.permissionDenied);
      }
    },
  );

  it.each(
    Object.keys(TABLE_PRIVILEGES).filter((table) => !DELETABLE.includes(table)),
  )(
    "ログインしていても、%s の行は消せない",
    async (table) => {
      const user = await db.createUser();
      expect(
        await db.errorCode({ user }, `delete from public.${table}`),
      ).toBe(SQLSTATE.permissionDenied);
    },
  );
});
