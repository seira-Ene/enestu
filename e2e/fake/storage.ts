import type { Actor, TestDb } from "../../supabase/tests/test-db";
import { parseJson, toRecord, toText } from "./json";

const MAX_BYTES = 1024 * 1024;
const TYPES = ["image/jpeg", "image/webp"];
const PREFIX = "/storage/v1/object/";

type StoredFile = { readonly bytes: Buffer; readonly type: string };
type Reply = { readonly status: number; readonly body: unknown };

/** 写真の置き場をまねる。許可は、実際のDBの決まりで判断する。 */
export class FakeStorage {
  private readonly files = new Map<string, StoredFile>();

  constructor(private readonly db: TestDb) {}

  /** 期限つきURLで開かれた写真。 */
  openSigned(pathname: string): StoredFile | null {
    const prefix = `${PREFIX}sign/notes/`;
    if (!pathname.startsWith(prefix)) return null;
    return (
      this.files.get(decodeURIComponent(pathname.slice(prefix.length))) ?? null
    );
  }

  async handle(
    actor: Actor,
    method: string,
    pathname: string,
    type: string,
    bytes: Buffer,
  ): Promise<Reply> {
    const path = decodeURIComponent(pathname.slice(PREFIX.length));
    if (method === "POST" && path === "sign/notes") {
      return this.sign(actor, parseJson(bytes.toString()));
    }
    if (method === "DELETE" && path === "notes") {
      return this.remove(actor, parseJson(bytes.toString()));
    }
    if (method === "POST" && path.startsWith("notes/")) {
      return this.upload(actor, path.slice("notes/".length), type, bytes);
    }
    return { status: 404, body: {} };
  }

  private async sign(actor: Actor, body: unknown): Promise<Reply> {
    const signed = [];
    for (const path of toList(toRecord(body).paths)) {
      const rows = await this.db.as(
        actor,
        "select name from storage.objects where bucket_id = 'notes' and name = $1",
        [path],
      );
      const isVisible = rows.length > 0;
      signed.push({
        path,
        signedURL: isVisible ? `/object/sign/notes/${path}?token=e2e` : null,
        error: isVisible ? null : "not found",
      });
    }
    return { status: 200, body: signed };
  }

  private async remove(actor: Actor, body: unknown): Promise<Reply> {
    const removed = [];
    for (const path of toList(toRecord(body).prefixes)) {
      const rows = await this.db.as(
        actor,
        "delete from storage.objects where bucket_id = 'notes' and name = $1 returning name",
        [path],
      );
      if (rows.length === 0) continue;
      this.files.delete(path);
      removed.push({ name: path });
    }
    return { status: 200, body: removed };
  }

  private async upload(
    actor: Actor,
    path: string,
    type: string,
    bytes: Buffer,
  ): Promise<Reply> {
    if (bytes.length > MAX_BYTES) return failed("413", "too large");
    if (!TYPES.includes(type)) return failed("415", `mime ${type}`);
    await this.db.as(
      actor,
      "insert into storage.objects (bucket_id, name) values ('notes', $1)",
      [path],
    );
    this.files.set(path, { bytes, type });
    return { status: 200, body: { Key: `notes/${path}` } };
  }
}

function toList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(toText) : [];
}

function failed(statusCode: string, message: string): Reply {
  return { status: 400, body: { statusCode, error: message, message } };
}
