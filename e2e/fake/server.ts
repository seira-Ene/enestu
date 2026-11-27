import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { TestDb, type Actor } from "../../supabase/tests/test-db";
import { FAKE_ENV, FAKE_PORT, FAKE_URL } from "../ports";
import { FakeAuth, type FakeUser } from "./auth";
import { toText } from "./json";
import { FakeRealtime } from "./realtime";
import { handleRest } from "./rest";
import { FakeStorage } from "./storage";

/**
 * Supabaseをまねたサーバー。
 * DBは実際のマイグレーションを適用したPGliteで、RLSと権限が本当に効く。
 */
export async function startFakeSupabase(): Promise<() => Promise<void>> {
  const backend = new Backend(await TestDb.create());
  const server = createServer((request, response) => {
    backend.handle(request, response).catch((error: unknown) => {
      console.error("まねたSupabaseで失敗", error);
      response.writeHead(500).end();
    });
  });
  server.on("upgrade", (request, socket) =>
    backend.realtime.accept(request, socket),
  );
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(FAKE_PORT, resolve);
  });
  return async () => {
    backend.realtime.dropAll();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await backend.close();
  };
}

class Backend {
  readonly auth = new FakeAuth();
  readonly realtime = new FakeRealtime((token) => this.auth.verifyToken(token));
  private readonly storage: FakeStorage;
  private readonly users = new Map<string, FakeUser>();
  /** DBのロールは接続に1つなので、1件ずつ処理する。 */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly db: TestDb) {
    this.storage = new FakeStorage(db);
  }

  close(): Promise<void> {
    return this.db.close();
  }

  async handle(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    const url = new URL(request.url ?? "/", FAKE_URL);
    const bytes = await readBytes(request);
    const method = request.method ?? "GET";

    if (url.pathname.startsWith("/control/")) {
      return sendJson(response, 200, await this.control(url));
    }
    if (url.pathname.startsWith("/auth/v1/")) {
      const reply = this.auth.handle(
        url.pathname.slice("/auth/v1/".length),
        url.searchParams,
        bytes.toString(),
      );
      if (reply.location !== undefined) {
        response.writeHead(reply.status, { location: reply.location }).end();
        return;
      }
      return sendJson(response, reply.status, reply.body);
    }
    const photo = method === "GET" ? this.storage.openSigned(url.pathname) : null;
    if (photo !== null) {
      response.writeHead(200, { "content-type": photo.type }).end(photo.bytes);
      return;
    }

    const actor = this.actorOf(request);
    if (actor === null) return sendJson(response, 401, { message: "JWT" });
    await this.exclusive(async () => {
      try {
        if (url.pathname.startsWith("/storage/v1/")) {
          const reply = await this.storage.handle(
            actor,
            method,
            url.pathname,
            toText(request.headers["content-type"]),
            bytes,
          );
          return sendJson(response, reply.status, reply.body);
        }
        const reply = await handleRest(this.db, actor, {
          method,
          path: url.pathname.slice("/rest/v1/".length),
          query: url.searchParams,
          prefer: toText(request.headers.prefer),
          body: bytes.toString(),
        });
        if (reply.count !== undefined) {
          response
            .writeHead(reply.status, { "content-range": `0-0/${reply.count}` })
            .end();
          return;
        }
        sendJson(response, reply.status, reply.body);
      } catch (error) {
        sendDbError(response, error);
      } finally {
        await this.sendSignals();
      }
    });
  }

  /** テストからの指示。 */
  private async control(url: URL): Promise<object> {
    switch (url.pathname) {
      case "/control/create-user": {
        const name = url.searchParams.get("name") ?? "";
        const id = await this.exclusive(() => this.db.createUser());
        this.users.set(id, { id, name, email: `${id}@example.com` });
        return { id };
      }
      case "/control/next-login":
        this.auth.nextUser =
          this.users.get(url.searchParams.get("id") ?? "") ?? null;
        return {};
      case "/control/add-study": {
        // ガチャの券を用意するため、学習の記録を直接足す。
        const owner = url.searchParams.get("owner") ?? "";
        const column =
          url.searchParams.get("kind") === "user" ? "user_id" : "device_id";
        const minutes = Number(url.searchParams.get("minutes"));
        await this.exclusive(() =>
          this.db.asOwner(
            `insert into study_logs (id, ${column}, subject, started_at, ended_at)
             values (gen_random_uuid(), $1, '数学',
                     now() - make_interval(mins => $2::int), now())`,
            [owner, minutes],
          ),
        );
        return {};
      }
      case "/control/fill-explanations": {
        // 件数の上限を試すため、用語を1つ作り、上限を通さずに説明を入れる。
        const device = url.searchParams.get("device") ?? "";
        const count = Number(url.searchParams.get("count"));
        await this.exclusive(async () => {
          const term = crypto.randomUUID();
          await this.db.asOwner(
            `insert into explain_terms (id, device_id, subject, term, keywords)
             values ($1, $2, '理科', '光合成', '{酸素}')`,
            [term, device],
          );
          await this.db.asOwner(
            "alter table explanation_logs disable trigger explanation_logs_limit",
          );
          try {
            await this.db.asOwner(
              `insert into explanation_logs
                 (id, device_id, term_id, body, total_count, missing, explained_at)
               select gen_random_uuid(), $1, $2, '説明', 1, '{}', now()
               from generate_series(1, $3::int)`,
              [device, term, count],
            );
          } finally {
            await this.db.asOwner(
              "alter table explanation_logs enable trigger explanation_logs_limit",
            );
          }
        });
        return {};
      }
      case "/control/realtime-down":
        this.realtime.isDown = true;
        this.realtime.dropAll();
        return {};
      case "/control/realtime-up":
        this.realtime.isDown = false;
        return {};
      default:
        throw new Error(`知らない指示: ${url.pathname}`);
    }
  }

  private actorOf(request: IncomingMessage): Actor | null {
    const bearer = toText(request.headers.authorization).replace("Bearer ", "");
    if (bearer.split(".").length === 3) {
      const user = this.auth.verifyToken(bearer);
      return user === null ? null : { user };
    }
    return request.headers.apikey === FAKE_ENV.SUPABASE_SECRET_KEY
      ? "service_role"
      : "anon";
  }

  /** DBのトリガーが書いた合図を、つながっている画面へ送る。 */
  private async sendSignals(): Promise<void> {
    const rows = await this.db.asOwner(
      "delete from realtime.messages returning topic, event, payload",
    );
    for (const { topic, event, payload } of rows) {
      this.realtime.broadcast({
        topic: toText(topic),
        event: toText(event),
        payload,
      });
    }
  }

  private exclusive<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(task, task);
    this.queue = result.catch(() => {});
    return result;
  }
}

async function readBytes(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function sendJson(
  response: ServerResponse,
  status: number,
  body: unknown,
): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(
    body === undefined
      ? ""
      : JSON.stringify(body, (_key, value: unknown) =>
          typeof value === "bigint" ? Number(value) : value,
        ),
  );
}

function sendDbError(response: ServerResponse, error: unknown): void {
  const code = error instanceof Error && "code" in error ? error.code : "XX000";
  const message = error instanceof Error ? error.message : "失敗";
  const isDuplicate = code === "23505";
  sendJson(response, code === "42501" ? 403 : 400, {
    code,
    message,
    statusCode: isDuplicate ? "409" : "400",
  });
}
