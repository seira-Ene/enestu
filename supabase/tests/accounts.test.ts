import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SQLSTATE, TestDb, type Actor, type Row } from "./test-db";

/** 利用者A・B・未ログインの間で、記録が混ざらないことを確かめる。 */

const MIGRATION = "20261125000000_add_user_accounts.sql";
const TABLES = [
  "study_logs",
  "quiz_cards",
  "answer_logs",
  "user_settings",
] as const;

let db: TestDb;
let alice: string;
let bob: string;
let device: string;

beforeAll(async () => {
  db = await TestDb.create();
});

beforeEach(async () => {
  await db.clear();
  alice = await db.createUser();
  bob = await db.createUser();
  device = randomUUID();
});

afterAll(async () => {
  await db.close();
});

type OwnerColumn = "device_id" | "user_id";
type Owner = { readonly column: OwnerColumn; readonly id: string };
const ofUser = (id: string): Owner => ({ column: "user_id", id });
const ofDevice = (id: string): Owner => ({ column: "device_id", id });

const studySql = (column: OwnerColumn) =>
  `insert into study_logs (id, ${column}, subject, started_at, ended_at)
   values ($1, $2, $3, now() - interval '60 seconds', now())`;
const cardSql = (column: OwnerColumn) =>
  `insert into quiz_cards (id, ${column}, subject, question, answer)
   values ($1, $2, $3, '問い', '答え')`;
const answerSql = (column: OwnerColumn) =>
  `insert into answer_logs
     (id, ${column}, card_id, user_answer, is_correct, answered_at)
   values ($1, $2, $3, '解答', true, now())`;
const settingSql = (column: OwnerColumn) =>
  `insert into user_settings (${column}, world_id) values ($1, $2)`;

/** 学習1件・カード1枚・解答1件・設定を、所有者の権限で用意する。 */
async function seed(
  owner: Owner,
  subject = "数学",
): Promise<{ study: string; card: string; answer: string }> {
  const [study, card, answer] = [randomUUID(), randomUUID(), randomUUID()];
  await db.asOwner(studySql(owner.column), [study, owner.id, subject]);
  await db.asOwner(cardSql(owner.column), [card, owner.id, subject]);
  await db.asOwner(answerSql(owner.column), [answer, owner.id, card]);
  await db.asOwner(settingSql(owner.column), [owner.id, "cafe"]);
  return { study, card, answer };
}

async function countRows(owner: Owner): Promise<number[]> {
  const counts: number[] = [];
  for (const table of TABLES) {
    const [row] = await db.asOwner(
      `select count(*)::int as n from ${table} where ${owner.column} = $1`,
      [owner.id],
    );
    counts.push(Number(row?.n));
  }
  return counts;
}

describe("読み取り", () => {
  it.each(TABLES)("%s は、本人の行だけが見える", async (table) => {
    await seed(ofUser(alice));
    await seed(ofUser(bob));
    await seed(ofDevice(device));
    for (const user of [alice, bob]) {
      expect(await db.as({ user }, `select user_id from ${table}`)).toEqual([
        { user_id: user },
      ]);
    }
  });

  it.each(TABLES)("%s は、トークンに本人のIDがなければ見えない", async (table) => {
    await seed(ofUser(alice));
    await seed(ofDevice(device));
    expect(await db.as("authenticated", `select * from ${table}`)).toEqual([]);
  });

  it("IDを指定しても、他人の行と端末の行は見えない", async () => {
    const others = await seed(ofUser(bob));
    const guests = await seed(ofDevice(device));
    for (const { study, card, answer } of [others, guests]) {
      const as = { user: alice };
      expect(
        await db.as(as, "select * from study_logs where id = $1", [study]),
      ).toEqual([]);
      expect(
        await db.as(as, "select * from quiz_cards where id = $1", [card]),
      ).toEqual([]);
      expect(
        await db.as(as, "select * from answer_logs where id = $1", [answer]),
      ).toEqual([]);
    }
  });
});

describe("追加", () => {
  it("自分の記録は追加できる", async () => {
    const as = { user: alice };
    const card = randomUUID();
    for (const [sql, params] of [
      [studySql("user_id"), [randomUUID(), alice, "数学"]],
      [cardSql("user_id"), [card, alice, "数学"]],
      [answerSql("user_id"), [randomUUID(), alice, card]],
      [settingSql("user_id"), [alice, "cafe"]],
    ] as const) {
      expect(await db.errorCode(as, sql, [...params])).toBeNull();
    }
    expect(await countRows(ofUser(alice))).toEqual([1, 1, 1, 1]);
  });

  it.each([
    ["他人", () => ofUser(bob)],
    ["端末", () => ofDevice(device)],
  ])("%s の記録は追加できない", async (_label, getOwner) => {
    const owner = getOwner();
    const as = { user: alice };
    const { card } = await seed(ofUser(alice));
    for (const [sql, params] of [
      [studySql(owner.column), [randomUUID(), owner.id, "数学"]],
      [cardSql(owner.column), [randomUUID(), owner.id, "数学"]],
      [answerSql(owner.column), [randomUUID(), owner.id, card]],
      [settingSql(owner.column), [owner.id, "cafe"]],
    ] as const) {
      expect(await db.errorCode(as, sql, [...params])).toBe(
        SQLSTATE.permissionDenied,
      );
    }
  });

  it("他人のカードと端末のカードには解答できない", async () => {
    const others = await seed(ofUser(bob));
    const guests = await seed(ofDevice(device));
    for (const { card } of [others, guests]) {
      expect(
        await db.errorCode({ user: alice }, answerSql("user_id"), [
          randomUUID(),
          alice,
          card,
        ]),
      ).toBe(SQLSTATE.foreignKeyViolation);
    }
  });

  it("端末からは、利用者のカードに解答できない", async () => {
    const { card } = await seed(ofUser(alice));
    expect(
      await db.errorCode("service_role", answerSql("device_id"), [
        randomUUID(),
        device,
        card,
      ]),
    ).toBe(SQLSTATE.foreignKeyViolation);
  });

  it("同じIDの再送は、他人の記録を変えずに無視される", async () => {
    const { card } = await seed(ofUser(bob));
    const sql = `${cardSql("user_id")} on conflict (id) do nothing`;
    const mine = randomUUID();
    for (let i = 0; i < 2; i += 1) {
      expect(
        await db.errorCode({ user: alice }, sql, [mine, alice, "数学"]),
      ).toBeNull();
    }
    expect(
      await db.errorCode({ user: alice }, sql, [card, alice, "乗っ取り"]),
    ).toBeNull();
    expect(
      await db.asOwner("select user_id, subject from quiz_cards where id = $1", [
        card,
      ]),
    ).toEqual([{ user_id: bob, subject: "数学" }]);
  });
});

describe("変更", () => {
  it("カードの内容は直せるが、他人と端末のカードは変わらない", async () => {
    const mine = await seed(ofUser(alice));
    const others = await seed(ofUser(bob));
    const guests = await seed(ofDevice(device));
    const rows = await db.as(
      { user: alice },
      "update quiz_cards set answer = '新しい', archived_at = now() returning id",
    );
    expect(rows).toEqual([{ id: mine.card }]);
    expect(
      await db.asOwner(
        "select answer, archived_at from quiz_cards where id in ($1, $2)",
        [others.card, guests.card],
      ),
    ).toEqual([
      { answer: "答え", archived_at: null },
      { answer: "答え", archived_at: null },
    ]);
  });

  it.each([
    ["quiz_cards", "user_id"],
    ["quiz_cards", "device_id"],
    ["quiz_cards", "id"],
    ["study_logs", "subject"],
    ["study_logs", "user_id"],
    ["answer_logs", "is_correct"],
    ["answer_logs", "user_id"],
    ["user_settings", "device_id"],
    ["user_settings", "id"],
  ])("%s の %s は変えられない", async (table, column) => {
    await seed(ofUser(alice));
    expect(
      await db.errorCode(
        { user: alice },
        `update ${table} set ${column} = ${column}`,
      ),
    ).toBe(SQLSTATE.permissionDenied);
  });

  it("設定は保存し直せるが、他人のものにはできない", async () => {
    const save = `${settingSql("user_id")} on conflict (user_id)
      do update set user_id = excluded.user_id, world_id = excluded.world_id`;
    const as: Actor = { user: alice };
    expect(await db.errorCode(as, save, [alice, "cafe"])).toBeNull();
    expect(await db.errorCode(as, save, [alice, "live"])).toBeNull();
    await db.asOwner(settingSql("user_id"), [bob, "otome"]);
    expect(await db.errorCode(as, save, [bob, "dungeon"])).toBe(
      SQLSTATE.permissionDenied,
    );
    const carol = await db.createUser();
    expect(
      await db.errorCode(as, "update user_settings set user_id = $1", [carol]),
    ).toBe(SQLSTATE.permissionDenied);
    expect(
      await db.asOwner("select user_id, world_id from user_settings"),
    ).toEqual(
      expect.arrayContaining([
        { user_id: alice, world_id: "live" },
        { user_id: bob, world_id: "otome" },
      ]),
    );
  });
});

describe("持ち主", () => {
  it.each(TABLES)("%s は、持ち主なしと二重の持ち主を拒否する", async (table) => {
    await seed(ofUser(alice));
    for (const values of [
      "user_id = null, device_id = null",
      "device_id = gen_random_uuid()",
    ]) {
      await expect(db.asOwner(`update ${table} set ${values}`)).rejects.toMatchObject(
        { code: SQLSTATE.checkViolation },
      );
    }
  });

  it("利用者を消すと、その人の記録だけがすべて消える", async () => {
    await seed(ofUser(alice));
    await seed(ofUser(bob));
    await seed(ofDevice(device));
    await db.asOwner("delete from auth.users where id = $1", [alice]);
    expect(await countRows(ofUser(alice))).toEqual([0, 0, 0, 0]);
    expect(await countRows(ofUser(bob))).toEqual([1, 1, 1, 1]);
    expect(await countRows(ofDevice(device))).toEqual([1, 1, 1, 1]);
  });
});

describe("本人の集計", () => {
  const stats = (actor: Actor) =>
    db.as(
      actor,
      `select subject, study_seconds::int, answer_count::int, correct_count::int,
         knowledge_count::int, understanding_count::int, careless_count::int
       from my_subject_stats(now() - interval '30 days') order by subject`,
    );
  const totals = (actor: Actor) =>
    db.as(
      actor,
      "select study_seconds::int, correct_count::int from my_progress_totals()",
    );

  it("自分の記録だけを数える", async () => {
    await seed(ofUser(alice), "数学");
    await seed(ofUser(bob), "英語");
    await seed(ofDevice(device), "理科");
    expect(await stats({ user: alice })).toEqual([
      {
        subject: "数学",
        study_seconds: 60,
        answer_count: 1,
        correct_count: 1,
        knowledge_count: 0,
        understanding_count: 0,
        careless_count: 0,
      },
    ]);
    expect(await totals({ user: alice })).toEqual([
      { study_seconds: 60, correct_count: 1 },
    ]);
    expect(await totals("authenticated")).toEqual([
      { study_seconds: 0, correct_count: 0 },
    ]);
  });

  it("端末の集計と、同じ数え方をする", async () => {
    const collect = async (owner: Owner) => {
      const { card } = await seed(owner, "数学");
      for (const [correct, reason] of [
        [false, "knowledge"],
        [false, "understanding"],
        [false, "careless"],
        [false, null],
      ] as const) {
        await db.asOwner(
          `insert into answer_logs (id, ${owner.column}, card_id, user_answer,
             is_correct, mistake_reason, answered_at)
           values (gen_random_uuid(), $1, $2, 'x', $3, $4, now())`,
          [owner.id, card, correct, reason],
        );
      }
      // 期間より前の学習と、隠したカードの解答。
      await db.asOwner(
        `insert into study_logs (id, ${owner.column}, subject, started_at, ended_at)
         values (gen_random_uuid(), $1, '歴史',
           now() - interval '40 days 60 seconds', now() - interval '40 days')`,
        [owner.id],
      );
      const hidden = randomUUID();
      await db.asOwner(cardSql(owner.column), [hidden, owner.id, "隠した科目"]);
      await db.asOwner(answerSql(owner.column), [randomUUID(), owner.id, hidden]);
      await db.asOwner(
        "update quiz_cards set archived_at = now() where id = $1",
        [hidden],
      );
    };
    await collect(ofUser(alice));
    await collect(ofDevice(device));

    const since = "now() - interval '30 days'";
    const mine = await db.as(
      { user: alice },
      `select * from my_subject_stats(${since}) order by subject`,
    );
    expect(mine).toHaveLength(1);
    expect(mine).toEqual(
      await db.as(
        "service_role",
        `select * from subject_stats($1, ${since}) order by subject`,
        [device],
      ),
    );
    expect(
      await db.as({ user: alice }, "select * from my_progress_totals()"),
    ).toEqual(
      await db.as("service_role", "select * from progress_totals($1)", [device]),
    );
  });
});

describe("引き継ぎ", () => {
  const CLAIM =
    "select study_logs::int, cards::int, answers::int from claim_device_records($1, $2)";
  const claim = (user: string, from = device): Promise<Row[]> =>
    db.as("service_role", CLAIM, [from, user]);

  it("端末の記録がすべて移り、件数が一致する", async () => {
    const { card } = await seed(ofDevice(device));
    await db.asOwner(answerSql("device_id"), [randomUUID(), device, card]);
    expect(await claim(alice)).toEqual([
      { study_logs: 1, cards: 1, answers: 2 },
    ]);
    expect(await countRows(ofDevice(device))).toEqual([0, 0, 0, 0]);
    expect(await countRows(ofUser(alice))).toEqual([1, 1, 2, 1]);
    expect(
      await db.as({ user: alice }, "select id from quiz_cards"),
    ).toEqual([{ id: card }]);
  });

  it("隠したカードも移すが、件数には入れない", async () => {
    await seed(ofDevice(device));
    await db.asOwner("update quiz_cards set archived_at = now()");
    expect(await claim(alice)).toEqual([
      { study_logs: 1, cards: 0, answers: 1 },
    ]);
    expect(await countRows(ofUser(alice))).toEqual([1, 1, 1, 1]);
  });

  it("2回目は何も移らず、先に引き継いだ人のものを奪えない", async () => {
    await seed(ofDevice(device));
    await claim(alice);
    const nothing = [{ study_logs: 0, cards: 0, answers: 0 }];
    expect(await claim(alice)).toEqual(nothing);
    expect(await claim(bob)).toEqual(nothing);
    expect(await countRows(ofUser(alice))).toEqual([1, 1, 1, 1]);
    expect(await countRows(ofUser(bob))).toEqual([0, 0, 0, 0]);
  });

  it("2台目の端末は足され、設定は先にあるものを優先する", async () => {
    const second = randomUUID();
    await seed(ofDevice(device));
    await seed(ofDevice(second));
    await db.asOwner(
      "update user_settings set world_id = 'live' where device_id = $1",
      [second],
    );
    await claim(alice);
    await claim(alice, second);
    expect(await countRows(ofUser(alice))).toEqual([2, 2, 2, 1]);
    expect(
      await db.asOwner("select world_id from user_settings where user_id = $1", [
        alice,
      ]),
    ).toEqual([{ world_id: "cafe" }]);
    expect(await countRows(ofDevice(second))).toEqual([0, 0, 0, 1]);
  });

  it("他の端末と他人の記録には触れない", async () => {
    const other = randomUUID();
    await seed(ofDevice(device));
    await seed(ofDevice(other));
    await seed(ofUser(bob));
    await claim(alice);
    expect(await countRows(ofDevice(other))).toEqual([1, 1, 1, 1]);
    expect(await countRows(ofUser(bob))).toEqual([1, 1, 1, 1]);
  });

  it("途中で失敗したら、何も移らない", async () => {
    await seed(ofDevice(device));
    // 最後に移す設定だけを失敗させる。
    await db.asOwner(
      `alter table user_settings add constraint break_claim
         check (user_id is null) not valid`,
    );
    try {
      expect(await db.errorCode("service_role", CLAIM, [device, alice])).toBe(
        SQLSTATE.checkViolation,
      );
    } finally {
      await db.asOwner("alter table user_settings drop constraint break_claim");
    }
    expect(await countRows(ofDevice(device))).toEqual([1, 1, 1, 1]);
    expect(await countRows(ofUser(alice))).toEqual([0, 0, 0, 0]);
  });

  it("いない利用者や、空の指定では移らない", async () => {
    await seed(ofDevice(device));
    expect(
      await db.errorCode("service_role", CLAIM, [device, randomUUID()]),
    ).toBe(SQLSTATE.foreignKeyViolation);
    expect(await db.errorCode("service_role", CLAIM, [device, null])).toBe(
      SQLSTATE.checkViolation,
    );
    expect(await db.errorCode("service_role", CLAIM, [null, alice])).toBeNull();
    expect(await countRows(ofDevice(device))).toEqual([1, 1, 1, 1]);
  });

  describe("名前", () => {
    const setup = async (column: OwnerColumn, id: string, name: string | null) =>
      db.asOwner(
        `insert into user_settings (${column}, world_id, hero_name)
         values ($1, $2, $3)`,
        [id, column === "user_id" ? "live" : "cafe", name],
      );
    const settingsOf = (column: OwnerColumn, id: string) =>
      db.asOwner(
        `select world_id, hero_name from user_settings where ${column} = $1`,
        [id],
      );

    it("アカウントに設定がなければ、世界線ごと移る", async () => {
      await setup("device_id", device, "そら");
      await claim(alice);
      expect(await settingsOf("user_id", alice)).toEqual([
        { world_id: "cafe", hero_name: "そら" },
      ]);
      expect(await settingsOf("device_id", device)).toEqual([]);
    });

    it("設定があって名前がなければ、名前だけ移り、端末からは消える", async () => {
      await setup("device_id", device, "そら");
      await setup("user_id", alice, null);
      await setup("user_id", bob, null);
      await claim(alice);
      await claim(alice);
      await claim(bob);
      expect(await settingsOf("user_id", alice)).toEqual([
        { world_id: "live", hero_name: "そら" },
      ]);
      expect(await settingsOf("device_id", device)).toEqual([
        { world_id: "cafe", hero_name: null },
      ]);
      expect(await settingsOf("user_id", bob)).toEqual([
        { world_id: "live", hero_name: null },
      ]);
    });

    it("アカウントの名前を優先し、端末の名前も消さない", async () => {
      await setup("device_id", device, "そら");
      await setup("user_id", alice, "うみ");
      await claim(alice);
      expect(await settingsOf("user_id", alice)).toEqual([
        { world_id: "live", hero_name: "うみ" },
      ]);
      expect(await settingsOf("device_id", device)).toEqual([
        { world_id: "cafe", hero_name: "そら" },
      ]);
    });

    it("他人の名前は、見ることも変えることもできない", async () => {
      await setup("user_id", bob, "うみ");
      const as: Actor = { user: alice };
      expect(await db.as(as, "select hero_name from user_settings")).toEqual([]);
      expect(
        await db.as(as, "update user_settings set hero_name = 'x' returning id"),
      ).toEqual([]);
      expect(await settingsOf("user_id", bob)).toEqual([
        { world_id: "live", hero_name: "うみ" },
      ]);
    });
  });

  it("画面からは直接呼べず、アプリの鍵でも持ち主を書き換えられない", async () => {
    await seed(ofDevice(device));
    for (const actor of ["anon", { user: alice }] as const) {
      expect(await db.errorCode(actor, CLAIM, [device, alice])).toBe(
        SQLSTATE.permissionDenied,
      );
    }
    for (const table of ["study_logs", "quiz_cards", "answer_logs"]) {
      expect(
        await db.errorCode(
          "service_role",
          `update ${table} set device_id = null, user_id = $1`,
          [alice],
        ),
      ).toBe(SQLSTATE.permissionDenied);
    }
  });
});

describe("これまでの記録", () => {
  it("適用前の記録が端末のもののまま残り、公開中の画面の操作も動く", async () => {
    const old = await TestDb.create(MIGRATION);
    try {
      const server = (sql: string, params: unknown[]) =>
        old.as("service_role", sql, params);
      const card = randomUUID();
      const saveSetting = `${settingSql("device_id")} on conflict (device_id)
        do update set device_id = excluded.device_id, world_id = excluded.world_id`;
      const recordOnce = async () => {
        await server(studySql("device_id"), [randomUUID(), device, "数学"]);
        await server(answerSql("device_id"), [randomUUID(), device, card]);
        await server(saveSetting, [device, "live"]);
      };
      await server(cardSql("device_id"), [card, device, "数学"]);
      await recordOnce();
      await old.migrate(MIGRATION);
      await recordOnce();
      await server("update quiz_cards set answer = '直した' where device_id = $1", [
        device,
      ]);
      expect(
        await server("select * from progress_totals($1)", [device]),
      ).toEqual([{ study_seconds: 120, correct_count: 2 }]);
      expect(
        await server("select count(*)::int as n from user_settings", []),
      ).toEqual([{ n: 1 }]);
    } finally {
      await old.close();
    }
  });
});
