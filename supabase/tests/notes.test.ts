import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES, MAX_NOTES, noteImagePath } from "@/domain/note";
import { SQLSTATE, TestDb, type Actor, type Row } from "./test-db";

/** 写真とメモが、本人のほかに見えず、際限なくためられないことを確かめる。 */

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

const INSERT =
  "insert into notes (id, user_id, body, has_image) values ($1, $2, $3, $4)";
const RESEND = `${INSERT} on conflict (id) do nothing`;
const PHOTO = "insert into storage.objects (bucket_id, name) values ('notes', $1)";
const SIGNALS = "select topic from realtime.messages";

async function addNote(
  user: string,
  { body = "メモ", hasImage = false } = {},
): Promise<string> {
  const id = randomUUID();
  await db.as({ user }, INSERT, [id, user, body, hasImage]);
  return id;
}

async function addPhotoNote(user: string): Promise<string> {
  const id = await addNote(user, { body: "", hasImage: true });
  await db.as({ user }, PHOTO, [noteImagePath(user, id)]);
  return id;
}

async function countNotes(user: string): Promise<number> {
  const [row] = await db.asOwner(
    "select count(*)::int as n from notes where user_id = $1",
    [user],
  );
  return Number(row?.n);
}

describe("メモ", () => {
  it("本人のものだけが見える", async () => {
    const id = await addNote(alice);
    await addNote(bob);
    expect(await db.as({ user: alice }, "select id from notes")).toEqual([
      { id },
    ]);
    expect(await db.as("authenticated", "select id from notes")).toEqual([]);
  });

  it("他人のメモは、追加も印つけも削除もできない", async () => {
    const as: Actor = { user: alice };
    const others = await addNote(bob, { hasImage: true });
    expect(
      await db.errorCode(as, INSERT, [randomUUID(), bob, "x", false]),
    ).toBe(SQLSTATE.permissionDenied);
    for (const sql of [
      "update notes set image_uploaded_at = now() where id = $1 returning id",
      "delete from notes where id = $1 returning id",
    ]) {
      expect(await db.as(as, sql, [others])).toEqual([]);
    }
    expect(await countNotes(bob)).toBe(1);
  });

  it("同じIDの再送は、二重にならず、他人のメモも変えない", async () => {
    const id = await addNote(alice);
    const others = await addNote(bob, { body: "Bのメモ" });
    for (const target of [id, others]) {
      expect(
        await db.errorCode({ user: alice }, RESEND, [
          target,
          alice,
          "書き換え",
          false,
        ]),
      ).toBeNull();
    }
    expect(
      await db.asOwner("select user_id, body from notes where id = $1", [
        others,
      ]),
    ).toEqual([{ user_id: bob, body: "Bのメモ" }]);
    expect(await countNotes(alice)).toBe(1);
  });

  it.each([
    ["空", "", false],
    ["空白だけ", " \n ", false],
    ["501文字", "あ".repeat(501), true],
  ])("%s は拒否する", async (_label, body, hasImage) => {
    expect(
      await db.errorCode({ user: alice }, INSERT, [
        randomUUID(),
        alice,
        body,
        hasImage,
      ]),
    ).toBe(SQLSTATE.checkViolation);
  });

  it("写真のないメモに、写真を送り終えた印は付けられない", async () => {
    const id = await addNote(alice);
    expect(
      await db.errorCode(
        { user: alice },
        "update notes set image_uploaded_at = now() where id = $1",
        [id],
      ),
    ).toBe(SQLSTATE.checkViolation);
  });

  it("利用者を消すと、その人のメモだけが消える", async () => {
    await addNote(alice);
    await addNote(bob);
    await db.asOwner("delete from auth.users where id = $1", [alice]);
    expect(await countNotes(alice)).toBe(0);
    expect(await countNotes(bob)).toBe(1);
  });
});

describe("件数の上限", () => {
  const fill = (user: string, count: number) =>
    db.as(
      { user },
      `insert into notes (id, user_id, body)
       select gen_random_uuid(), $1, 'x' from generate_series(1, $2::int)`,
      [user, count],
    );

  it("200件まで追加でき、超える分は拒否する", async () => {
    await fill(alice, MAX_NOTES - 1);
    const last = await addNote(alice);
    await expect(addNote(alice)).rejects.toThrow("notes_limit");
    expect(await countNotes(alice)).toBe(MAX_NOTES);
    // 上限ちょうどでも、保存済みのものの再送と、他の人の追加はできる。
    expect(
      await db.errorCode({ user: alice }, RESEND, [last, alice, "メモ", false]),
    ).toBeNull();
    await addNote(bob);
  });

  it("まとめて追加しても超えられない", async () => {
    await expect(fill(alice, MAX_NOTES + 1)).rejects.toThrow("notes_limit");
    expect(await countNotes(alice)).toBe(0);
  });
});

describe("写真", () => {
  it("置き場は非公開で、大きさと種類を制限している", async () => {
    expect(
      await db.asOwner(
        `select public, file_size_limit::int as size, allowed_mime_types as types
         from storage.buckets where id = 'notes'`,
      ),
    ).toEqual([
      {
        public: false,
        size: MAX_IMAGE_BYTES,
        types: ["image/jpeg", "image/webp"],
      },
    ]);
  });

  it("写真つきの自分のメモにだけ置け、上書きはできない", async () => {
    const id = await addNote(alice, { hasImage: true });
    const path = noteImagePath(alice, id);
    const as: Actor = { user: alice };
    expect(await db.errorCode(as, PHOTO, [path])).toBeNull();
    expect(await db.errorCode(as, PHOTO, [path])).toBe(
      SQLSTATE.uniqueViolation,
    );
    expect(
      await db.as(as, "update storage.objects set name = 'x' returning name"),
    ).toEqual([]);
  });

  it("決めた名前のほかには置けない", async () => {
    const photo = await addNote(alice, { hasImage: true });
    const text = await addNote(alice);
    const others = await addNote(bob, { hasImage: true });
    for (const path of [
      noteImagePath(alice, text),
      noteImagePath(alice, randomUUID()),
      noteImagePath(alice, others),
      noteImagePath(bob, others),
      `${noteImagePath(alice, photo)}.jpg`,
      `${alice}/x/${photo}`,
      photo,
    ]) {
      expect(await db.errorCode({ user: alice }, PHOTO, [path])).toBe(
        SQLSTATE.permissionDenied,
      );
    }
    expect(
      await db.errorCode("anon", PHOTO, [noteImagePath(alice, photo)]),
    ).toBe(SQLSTATE.permissionDenied);
  });

  it("他人の写真は、見ることも消すこともできない", async () => {
    await addPhotoNote(alice);
    const as: Actor = { user: bob };
    expect(await db.as(as, "select name from storage.objects")).toEqual([]);
    expect(
      await db.as(as, "delete from storage.objects returning name"),
    ).toEqual([]);
    expect(await db.as("anon", "select name from storage.objects")).toEqual([]);
  });

  it("写真を消すまで、メモは消せない", async () => {
    const id = await addPhotoNote(alice);
    const as: Actor = { user: alice };
    const remove = "delete from notes where id = $1 returning id";
    expect(await db.as(as, remove, [id])).toEqual([]);
    expect(
      await db.as(as, "delete from storage.objects returning name"),
    ).toEqual([{ name: noteImagePath(alice, id) }]);
    expect(await db.as(as, remove, [id])).toEqual([{ id }]);
  });
});

describe("合図", () => {
  const read = (actor: Actor, topic: string): Promise<Row[]> =>
    db.asTopic(actor, topic, SIGNALS);

  it("追加・変更・削除のたびに、持ち主あてに送る。中身は入れない", async () => {
    const id = await addNote(alice, { hasImage: true });
    await db.as(
      { user: alice },
      "update notes set image_uploaded_at = now() where id = $1",
      [id],
    );
    await db.as({ user: alice }, "delete from notes where id = $1", [id]);
    expect(
      await db.asOwner(
        "select topic, event, payload, private, extension from realtime.messages",
      ),
    ).toEqual(
      Array.from({ length: 3 }, () => ({
        topic: `notes:${alice}`,
        event: "notes_changed",
        payload: {},
        private: true,
        extension: "broadcast",
      })),
    );
  });

  it("本人だけが、自分あての合図を受け取れる", async () => {
    await addNote(alice);
    const topic = `notes:${alice}`;
    expect(await read({ user: alice }, topic)).toHaveLength(1);
    for (const [actor, other] of [
      [{ user: bob }, topic],
      [{ user: alice }, `notes:${bob}`],
      [{ user: alice }, ""],
      [{ user: alice }, "notes:"],
      ["authenticated", "notes:"],
      ["anon", topic],
    ] as const) {
      expect(await read(actor, other)).toEqual([]);
    }
  });

  it("画面からは送れない", async () => {
    for (const actor of ["anon", { user: alice }] as const) {
      expect(
        await db.errorCode(
          actor,
          "insert into realtime.messages (topic, extension) values ($1, 'broadcast')",
          [`notes:${bob}`],
        ),
      ).toBe(SQLSTATE.permissionDenied);
    }
  });
});
