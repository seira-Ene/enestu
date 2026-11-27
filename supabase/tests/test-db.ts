import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const MIGRATIONS = join(process.cwd(), "supabase/migrations/");

export type Role = "anon" | "authenticated" | "service_role";
/** 誰として操作するか。利用者なら、その人としてログインした状態になる。 */
export type Actor = Role | { readonly user: string };
export type Row = Record<string, unknown>;

/**
 * Supabaseの権限の初期状態と、認証・写真・合図の仕組みの要点をまねる。
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

  create schema storage;
  grant usage on schema storage to anon, authenticated, service_role;
  create table storage.buckets (
    id text primary key,
    name text not null,
    public boolean not null default false,
    file_size_limit bigint,
    allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id),
    name text not null,
    unique (bucket_id, name)
  );
  alter table storage.objects enable row level security;
  grant all on storage.objects to anon, authenticated, service_role;
  create function storage.foldername(name text) returns text[]
    language sql immutable as $$
    select (string_to_array(name, '/'))[1:cardinality(string_to_array(name, '/')) - 1]
  $$;

  create schema realtime;
  grant usage on schema realtime to anon, authenticated, service_role;
  create table realtime.messages (
    topic text not null,
    extension text not null,
    payload jsonb,
    event text,
    private boolean
  );
  alter table realtime.messages enable row level security;
  grant select, insert on realtime.messages to anon, authenticated, service_role;
  create function realtime.topic() returns text language sql stable as $$
    select nullif(current_setting('realtime.topic', true), '')
  $$;
  create function realtime.send(
    payload jsonb, event text, topic text, private boolean default true
  ) returns void language sql as $$
    insert into realtime.messages (payload, event, topic, private, extension)
    values (payload, event, topic, private, 'broadcast')
  $$;
  revoke all on function realtime.send(jsonb, text, text, boolean) from public;
`;

/** マイグレーションで中身を入れる表。テストの間でも空にしない。 */
const MASTER_TABLES = ["gacha_rarities", "gacha_items"];

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

  /** 記録のテーブルを空にする。テストの間で記録を持ち越さないため。 */
  async clear(): Promise<void> {
    const tables = await this.asOwner(
      `select quote_ident(tablename) as name from pg_tables
       where schemaname = 'public' and not (tablename = any($1))`,
      [MASTER_TABLES],
    );
    const names = tables.map((row) => `public.${String(row.name)}`);
    names.push("auth.users", "storage.objects", "realtime.messages");
    await this.pg.exec(`truncate ${names.join(", ")} cascade`);
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

  /** Realtimeの、その宛先につないだ状態で実行する。 */
  async asTopic(actor: Actor, topic: string, sql: string): Promise<Row[]> {
    await this.asOwner("select set_config('realtime.topic', $1, false)", [
      topic,
    ]);
    try {
      return await this.as(actor, sql);
    } finally {
      await this.pg.exec("reset realtime.topic");
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
