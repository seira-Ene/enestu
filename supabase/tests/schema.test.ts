import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MAX_HERO_NAME_LENGTH } from "@/domain/hero-name";
import { WORLD_IDS } from "@/themes/types";
import { listMigrations, SQLSTATE, TestDb, type Row } from "./test-db";

let db: TestDb;
const device = randomUUID();

beforeAll(async () => {
  db = await TestDb.create();
});

beforeEach(async () => {
  await db.clear();
});

afterAll(async () => {
  await db.close();
});

const server = (sql: string, params: unknown[] = []) =>
  db.as("service_role", sql, params);
const failure = (sql: string, params: unknown[] = []) =>
  db.errorCode("service_role", sql, params);

const STUDY =
  "insert into study_logs (id, device_id, subject, started_at, ended_at) values ($1, $2, $3, $4, $5)";
const CARD =
  "insert into quiz_cards (id, device_id, subject, question, answer) values ($1, $2, $3, $4, $5)";
const ANSWER =
  "insert into answer_logs (id, device_id, card_id, user_answer, is_correct, mistake_reason, answered_at) values (gen_random_uuid(), $1, $2, $3, $4, $5, now())";

async function addCard(subject = "数学", owner = device): Promise<string> {
  const id = randomUUID();
  await server(CARD, [id, owner, subject, "問い", "答え"]);
  return id;
}

/** 今から secondsAgo 秒前までの、seconds 秒間の学習。 */
async function addStudy(
  subject: string,
  seconds: number,
  secondsAgo = 0,
  owner = device,
): Promise<void> {
  const end = Date.now() - secondsAgo * 1000;
  await server(STUDY, [
    randomUUID(),
    owner,
    subject,
    new Date(end - seconds * 1000),
    new Date(end),
  ]);
}

describe("マイグレーション", () => {
  it("ファイル名が時刻で始まり、重ならない", () => {
    const names = listMigrations();
    expect(names.length).toBeGreaterThan(0);
    expect(names.every((name) => /^\d{14}_[a-z0-9_]+\.sql$/.test(name))).toBe(
      true,
    );
    expect(new Set(names.map((name) => name.slice(0, 14))).size).toBe(
      names.length,
    );
  });
});

describe("study_logs", () => {
  const insert = (subject: string, start: string, end: string) =>
    failure(STUDY, [randomUUID(), device, subject, start, end]);

  it("学習時間を、DBが切り捨てで計算する", async () => {
    await server(STUDY, [
      randomUUID(),
      device,
      "数学",
      "2026-11-24T00:00:00Z",
      "2026-11-24T00:01:30.900Z",
    ]);
    expect(await server("select duration_seconds from study_logs")).toEqual([
      { duration_seconds: 90 },
    ]);
  });

  it.each([
    ["1秒未満", "数学", "2026-11-24T00:00:00Z", "2026-11-24T00:00:00.9Z"],
    ["逆向き", "数学", "2026-11-24T00:01:00Z", "2026-11-24T00:00:00Z"],
    ["999時間超", "数学", "2026-10-13T08:59:59Z", "2026-11-24T00:00:00Z"],
    ["空の科目", " ", "2026-11-24T00:00:00Z", "2026-11-24T00:01:00Z"],
    [
      "長い科目",
      "あ".repeat(51),
      "2026-11-24T00:00:00Z",
      "2026-11-24T00:01:00Z",
    ],
  ])("%s は拒否する", async (_label, subject, start, end) => {
    expect(await insert(subject, start, end)).toBe(SQLSTATE.checkViolation);
  });

  it.each([
    ["24時間1秒", "2026-11-22T23:59:59Z", 86_401],
    ["999時間ちょうど", "2026-10-13T09:00:00Z", 3_596_400],
  ])("%s の記録を保存できる", async (_label, start, seconds) => {
    expect(await insert("数学", start, "2026-11-24T00:00:00Z")).toBeNull();
    expect(
      await server("select duration_seconds from study_logs order by 1 desc"),
    ).toContainEqual({ duration_seconds: seconds });
  });

  it("同じIDは二重に登録できない", async () => {
    const params = [
      randomUUID(),
      device,
      "数学",
      "2026-11-24T00:00:00Z",
      "2026-11-24T00:01:00Z",
    ];
    expect(await failure(STUDY, params)).toBeNull();
    expect(await failure(STUDY, params)).toBe(SQLSTATE.uniqueViolation);
    expect(
      await failure(`${STUDY} on conflict (id) do nothing`, params),
    ).toBeNull();
    expect(await server("select id from study_logs")).toHaveLength(1);
  });
});

describe("quiz_cards", () => {
  it.each([
    ["空の問題", "数学", " ", "答え"],
    ["空の答え", "数学", "問い", ""],
    ["長い問題", "数学", "あ".repeat(201), "答え"],
    ["長い答え", "数学", "問い", "あ".repeat(101)],
  ])("%s は拒否する", async (_label, subject, question, answer) => {
    expect(
      await failure(CARD, [randomUUID(), device, subject, question, answer]),
    ).toBe(SQLSTATE.checkViolation);
  });

  it("内容は直せるが、持ち主は変えられず、消せない", async () => {
    const id = await addCard();
    expect(
      await failure("update quiz_cards set answer = '新しい' where id = $1", [
        id,
      ]),
    ).toBeNull();
    expect(
      await failure("update quiz_cards set answer = ' ' where id = $1", [id]),
    ).toBe(SQLSTATE.checkViolation);
    expect(
      await failure("update quiz_cards set device_id = $1 where id = $2", [
        randomUUID(),
        id,
      ]),
    ).toBe(SQLSTATE.permissionDenied);
    expect(await failure("delete from quiz_cards where id = $1", [id])).toBe(
      SQLSTATE.permissionDenied,
    );
  });
});

describe("answer_logs", () => {
  const answer = (
    card: string,
    isCorrect: boolean,
    reason: string | null,
    owner = device,
  ) => failure(ANSWER, [owner, card, "解答", isCorrect, reason]);

  it("自分のカードにだけ解答できる", async () => {
    const card = await addCard();
    expect(await answer(card, true, null)).toBeNull();
    expect(await answer(card, true, null, randomUUID())).toBe(
      SQLSTATE.foreignKeyViolation,
    );
    expect(await answer(randomUUID(), true, null)).toBe(
      SQLSTATE.foreignKeyViolation,
    );
  });

  it("誤答原因は、不正解のときだけ3種類を受け付ける", async () => {
    const card = await addCard();
    for (const reason of ["knowledge", "understanding", "careless", null]) {
      expect(await answer(card, false, reason)).toBeNull();
    }
    expect(await answer(card, true, "careless")).toBe(SQLSTATE.checkViolation);
    expect(await answer(card, false, "other")).toBe(SQLSTATE.checkViolation);
  });

  it("101文字以上の解答は拒否する", async () => {
    const card = await addCard();
    expect(
      await failure(ANSWER, [device, card, "あ".repeat(101), false, null]),
    ).toBe(SQLSTATE.checkViolation);
  });
});

describe("user_settings", () => {
  const save = (world: string) =>
    failure(
      `insert into user_settings (device_id, world_id) values ($1, $2)
       on conflict (device_id) do update set world_id = excluded.world_id`,
      [device, world],
    );

  it("アプリの世界線をすべて保存でき、端末ごとに1行", async () => {
    for (const world of WORLD_IDS) expect(await save(world)).toBeNull();
    expect(await server("select world_id from user_settings")).toHaveLength(1);
  });

  it("知らない世界線は拒否する", async () => {
    expect(await save("space")).toBe(SQLSTATE.checkViolation);
  });

  const saveName = (name: string | null) =>
    failure(
      `insert into user_settings (device_id, hero_name) values ($1, $2)
       on conflict (device_id) do update set hero_name = excluded.hero_name`,
      [device, name],
    );
  const saved = () => server("select world_id, hero_name from user_settings");

  it("名前と世界線は、どちらを先に決めても、もう片方を消さない", async () => {
    expect(await saveName("そら")).toBeNull();
    expect(await saved()).toEqual([{ world_id: null, hero_name: "そら" }]);
    expect(await save("cafe")).toBeNull();
    expect(await saved()).toEqual([{ world_id: "cafe", hero_name: "そら" }]);
    expect(await saveName(null)).toBeNull();
    expect(await saved()).toEqual([{ world_id: "cafe", hero_name: null }]);
  });

  it("名前は、アプリの上限まで受け付ける", async () => {
    expect(await saveName("あ".repeat(MAX_HERO_NAME_LENGTH))).toBeNull();
    expect(await saveName("😀".repeat(MAX_HERO_NAME_LENGTH))).toBeNull();
  });

  it.each(["", " そら", "そ\nら", "あ".repeat(MAX_HERO_NAME_LENGTH + 1)])(
    "名前「%s」は拒否する",
    async (name) => {
      expect(await saveName(name)).toBe(SQLSTATE.checkViolation);
    },
  );
});

describe("集計", () => {
  const stats = async (owner = device, days = 30): Promise<Row[]> =>
    server(
      `select subject, study_seconds::int, answer_count::int, correct_count::int,
         knowledge_count::int, understanding_count::int, careless_count::int
       from subject_stats($1, now() - make_interval(days => $2)) order by subject`,
      [owner, days],
    );
  const totals = (owner = device) =>
    server(
      "select study_seconds::int, correct_count::int from progress_totals($1)",
      [owner],
    );
  const DAY = 86_400;

  it("科目ごとに、学習時間・解答・原因を数える", async () => {
    const card = await addCard("数学");
    await addStudy("数学", 600);
    await addStudy("数学", 60);
    await addStudy("体育", 30);
    for (const [isCorrect, reason] of [
      [true, null],
      [false, "knowledge"],
      [false, "careless"],
      [false, null],
    ] as const) {
      await server(ANSWER, [device, card, "x", isCorrect, reason]);
    }
    expect(await stats()).toEqual([
      {
        subject: "体育",
        study_seconds: 30,
        answer_count: 0,
        correct_count: 0,
        knowledge_count: 0,
        understanding_count: 0,
        careless_count: 0,
      },
      {
        subject: "数学",
        study_seconds: 660,
        answer_count: 4,
        correct_count: 1,
        knowledge_count: 1,
        understanding_count: 0,
        careless_count: 1,
      },
    ]);
    expect(await totals()).toEqual([{ study_seconds: 690, correct_count: 1 }]);
  });

  it("期間より前の記録は集計から外し、合計には含める", async () => {
    await addStudy("数学", 100, 40 * DAY);
    expect(await stats()).toEqual([]);
    expect(await stats(device, 60)).toHaveLength(1);
    expect(await totals()).toEqual([{ study_seconds: 100, correct_count: 0 }]);
  });

  it("隠したカードは集計から外し、合計には含める", async () => {
    const card = await addCard("数学");
    await server(ANSWER, [device, card, "x", true, null]);
    await server("update quiz_cards set archived_at = now() where id = $1", [
      card,
    ]);
    expect(await stats()).toEqual([]);
    expect(await totals()).toEqual([{ study_seconds: 0, correct_count: 1 }]);
  });

  it("他の端末の記録を含めない", async () => {
    const other = randomUUID();
    await addStudy("数学", 500, 0, other);
    const card = await addCard("数学", other);
    await server(ANSWER, [other, card, "x", true, null]);
    expect(await stats()).toEqual([]);
    expect(await totals()).toEqual([{ study_seconds: 0, correct_count: 0 }]);
    expect(await stats(other)).toHaveLength(1);
  });
});
