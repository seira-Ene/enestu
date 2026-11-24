import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const MIGRATIONS = fileURLToPath(new URL("../migrations/", import.meta.url));

export type Role = "anon" | "authenticated" | "service_role";
/** 誰として操作するか。利用者なら、その人としてログインした状態になる。 */
export type Actor = Role | { readonly user: string };
export type Row = Record<string, unknown>;

/**
 * Supabaseの権限の初期状態をまねる。
 * 新しいテーブルと関数が anon / authenticated に開放される、最も緩い設定にし、
 * マイグレーションで閉じ忘れたら検査で気づけるようにする。
 */
const SUPABASE_LIKE_SETUP = `
  create role anon;
  create role authenticated;
  create role service_role bypassrls;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public
    grant all on tables to anon, authenticated;
  alter default privileges in schema public
    grant execute on functions to anon, authenticated;

  create schema auth;
  grant usage on schema auth to anon, authenticated, service_role;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select (
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
    )::uuid
  $$;
`;

/** マイグレーションのファイル名を、適用する順に返す。 */
export function listMigrations(): string[] {
  return readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

/** テスト用のPostgreSQL。本番のDBには接続しない。 */
export class TestDb {
  private constructor(private readonly pg: PGlite) {}

  /** マイグレーションを適用したDBを作る。before を渡すと、その手前で止める。 */
  static async create(before?: string): Promise<TestDb> {
    const db = new TestDb(new PGlite());
    await db.pg.exec(SUPABASE_LIKE_SETUP);
    for (const name of listMigrations()) {
      if (name === before) break;
      await db.migrate(name);
    }
    return db;
  }

  async migrate(name: string): Promise<void> {
    await this.pg.exec(readFileSync(MIGRATIONS + name, "utf8"));
  }

  /** すべてのテーブルを空にする。テストの間で記録を持ち越さないため。 */
  async clear(): Promise<void> {
    const tables = await this.asOwner(
      "select quote_ident(tablename) as name from pg_tables where schemaname = 'public'",
    );
    const names = tables.map((row) => `public.${String(row.name)}`);
    await this.pg.exec(`truncate ${names.join(", ")}, auth.users cascade`);
  }

  /** 利用者を1人作り、IDを返す。 */
  async createUser(): Promise<string> {
    const id = randomUUID();
    await this.asOwner("insert into auth.users (id) values ($1)", [id]);
    return id;
  }

  /** 所有者の権限で実行する。準備と検査にだけ使う。 */
  async asOwner(sql: string, params: unknown[] = []): Promise<Row[]> {
    return (await this.pg.query<Row>(sql, params)).rows;
  }

  async as(actor: Actor, sql: string, params: unknown[] = []): Promise<Row[]> {
    const role = typeof actor === "string" ? actor : "authenticated";
    const claims =
      typeof actor === "string" ? "" : JSON.stringify({ sub: actor.user });
    await this.asOwner("select set_config('request.jwt.claims', $1, false)", [
      claims,
    ]);
    await this.pg.exec(`set role ${role}`);
    try {
      return await this.asOwner(sql, params);
    } finally {
      await this.pg.exec("reset role; reset request.jwt.claims");
    }
  }

  /** 失敗したときのSQLSTATE。成功したら null。 */
  async errorCode(
    actor: Actor,
    sql: string,
    params: unknown[] = [],
  ): Promise<string | null> {
    try {
      await this.as(actor, sql, params);
      return null;
    } catch (error) {
      if (error instanceof Error && "code" in error) return String(error.code);
      throw error;
    }
  }

  close(): Promise<void> {
    return this.pg.close();
  }
}

/** よく使うSQLSTATE。 */
export const SQLSTATE = {
  permissionDenied: "42501",
  checkViolation: "23514",
  foreignKeyViolation: "23503",
  uniqueViolation: "23505",
} as const;
