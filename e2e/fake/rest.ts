import type { Actor, Row, TestDb } from "../../supabase/tests/test-db";
import { parseJson, toRecord } from "./json";

export type RestRequest = {
  readonly method: string;
  readonly path: string;
  readonly query: URLSearchParams;
  readonly prefer: string;
  readonly body: string;
};

export type RestReply = {
  readonly status: number;
  readonly body?: unknown;
  /** HEAD のときの件数。 */
  readonly count?: number;
};

/** 名前として使える文字（小文字・数字・下線。先頭は数字以外）だけを受け付ける。 */
function quote(name: string): string {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error(`使えない名前: ${name}`);
  return `"${name}"`;
}

/** PostgREST のうち、アプリが使う書き方だけをまねる。権限は実際のDBが決める。 */
export async function handleRest(
  db: TestDb,
  actor: Actor,
  request: RestRequest,
): Promise<RestReply> {
  if (request.path.startsWith("rpc/")) return callFunction(db, actor, request);

  const table = `public.${quote(request.path)}`;
  const columns = (request.query.get("select") ?? "")
    .split(",")
    .filter((name) => name !== "")
    .map((name) => quote(name.trim()))
    .join(", ");
  const params: unknown[] = [];
  const bind = (value: unknown) => `$${params.push(value)}`;
  const run = (sql: string) => db.as(actor, sql, params);

  switch (request.method) {
    case "HEAD": {
      const where = whereClause(request.query, bind);
      const [row] = await run(`select count(*)::int as n from ${table}${where}`);
      return { status: 200, count: Number(row?.n) };
    }
    case "GET": {
      const where = whereClause(request.query, bind);
      return {
        status: 200,
        body: await run(
          `select ${columns} from ${table}${where}${tail(request.query)}`,
        ),
      };
    }
    case "POST":
      await run(insertSql(table, request, bind));
      return { status: 201 };
    case "PATCH": {
      const sets = Object.entries(toRecord(parseJson(request.body))).map(
        ([name, value]) => `${quote(name)} = ${bind(value)}`,
      );
      const where = whereClause(request.query, bind);
      return {
        status: 200,
        body: await run(
          `update ${table} set ${sets.join(", ")}${where}${returning(columns)}`,
        ),
      };
    }
    case "DELETE": {
      const where = whereClause(request.query, bind);
      return {
        status: 200,
        body: await run(`delete from ${table}${where}${returning(columns)}`),
      };
    }
    default:
      return { status: 405 };
  }
}

async function callFunction(
  db: TestDb,
  actor: Actor,
  { path, body }: RestRequest,
): Promise<RestReply> {
  const args = Object.entries(toRecord(parseJson(body)));
  const list = args.map(([name], index) => `${quote(name)} => $${index + 1}`);
  const rows: Row[] = await db.as(
    actor,
    `select * from public.${quote(path.slice("rpc/".length))}(${list.join(", ")})`,
    args.map(([, value]) => value),
  );
  return { status: 200, body: rows };
}

function insertSql(
  table: string,
  { query, prefer, body }: RestRequest,
  bind: (value: unknown) => string,
): string {
  const parsed = parseJson(body);
  const rows = (Array.isArray(parsed) ? parsed : [parsed]).map(toRecord);
  const names = Object.keys(rows[0] ?? {});
  const tuples = rows.map(
    (row) => `(${names.map((name) => bind(row[name])).join(", ")})`,
  );
  const target = quote(query.get("on_conflict") ?? "id");
  let conflict = "";
  if (prefer.includes("ignore-duplicates")) {
    conflict = ` on conflict (${target}) do nothing`;
  } else if (prefer.includes("merge-duplicates")) {
    const sets = names.map((name) => `${quote(name)} = excluded.${quote(name)}`);
    conflict = ` on conflict (${target}) do update set ${sets.join(", ")}`;
  }
  return `insert into ${table} (${names.map(quote).join(", ")}) values ${tuples.join(", ")}${conflict}`;
}

const RESERVED = ["select", "order", "limit", "on_conflict", "columns"];
const OPERATORS = new Map([
  ["eq", "="],
  ["gte", ">="],
  ["lt", "<"],
]);

function whereClause(
  query: URLSearchParams,
  bind: (value: unknown) => string,
): string {
  const conditions: string[] = [];
  for (const [name, value] of query) {
    if (RESERVED.includes(name)) continue;
    conditions.push(
      name === "or" ? orCondition(value) : condition(name, value, bind),
    );
  }
  return conditions.length === 0 ? "" : ` where ${conditions.join(" and ")}`;
}

function condition(
  name: string,
  filter: string,
  bind: (value: unknown) => string,
): string {
  const dot = filter.indexOf(".");
  const operator = filter.slice(0, dot);
  const value = filter.slice(dot + 1);
  if (operator === "is") return `${quote(name)} is ${quote(value).slice(1, -1)}`;
  if (operator === "in") {
    const ids = value.slice(1, -1).replaceAll('"', "").split(",");
    return `${quote(name)} = any(${bind(ids)}::uuid[])`;
  }
  const symbol = OPERATORS.get(operator);
  if (symbol === undefined) throw new Error(`使えない条件: ${filter}`);
  return `${quote(name)} ${symbol} ${bind(value)}`;
}

/** 「(a.is.false,b.not.is.null)」の形だけを読む。 */
function orCondition(value: string): string {
  const parts = value.slice(1, -1).split(",").map((part) => {
    const [name = "", ...words] = part.split(".");
    return `${quote(name)} ${words
      .map((word) => quote(word).slice(1, -1))
      .join(" ")}`.replace("not is null", "is not null");
  });
  return `(${parts.join(" or ")})`;
}

function tail(query: URLSearchParams): string {
  const [column, direction] = (query.get("order") ?? "").split(".");
  const order = column
    ? ` order by ${quote(column)} ${direction === "desc" ? "desc" : "asc"}`
    : "";
  const limit = query.get("limit");
  return order + (limit === null ? "" : ` limit ${Number(limit)}`);
}

function returning(columns: string): string {
  return columns === "" ? "" : ` returning ${columns}`;
}
