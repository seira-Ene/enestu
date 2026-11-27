import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  GACHA_PITY,
  GACHA_RARITIES,
  GACHA_SLOTS,
  gachaItemId,
  PITY_FLOOR,
  rarityRank,
  rarityRates,
  TEN_PULL_FLOOR,
  ticketsEarned,
} from "@/domain/gacha";
import { ROW_LIMIT_MESSAGE, ROW_LIMITS } from "@/domain/limits";
import { WORLD_IDS } from "@/themes/types";
import { TestDb, type Actor, type Row } from "./test-db";

/** ガチャの券・くじ・記録が、決めたとおりに動き、本人のほかに触れないこと。 */

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

const TOP = GACHA_RARITIES.filter(
  ({ id }) => rarityRank(id) >= rarityRank(PITY_FLOOR),
).map(({ id }) => id as string);
const SUPER = GACHA_RARITIES.filter(
  ({ id }) => rarityRank(id) >= rarityRank(TEN_PULL_FLOOR),
).map(({ id }) => id as string);

/** 失敗したら、その理由。成功したら行。 */
async function attempt(
  actor: Actor,
  sql: string,
  params: unknown[] = [],
): Promise<{ rows: Row[]; error: string | null }> {
  try {
    return { rows: await db.as(actor, sql, params), error: null };
  } catch (error) {
    if (error instanceof Error) return { rows: [], error: error.message };
    throw error;
  }
}

const userPull = (user: string, world: string, count: number) =>
  attempt({ user }, "select * from my_gacha_pull($1, $2)", [world, count]);
const devicePull = (id: string | null, world: string, count: number) =>
  attempt("service_role", "select * from gacha_pull($1, $2, $3)", [
    id,
    world,
    count,
  ]);

async function userStatus(user: string): Promise<Row | undefined> {
  return (await db.as({ user }, "select * from my_gacha_status()"))[0];
}
async function deviceStatus(id: string): Promise<Row | undefined> {
  return (await db.as("service_role", "select * from gacha_status($1)", [id]))[0];
}

/** 学習の記録を足す。券をたくさん用意するときにも使う。 */
async function study(column: "device_id" | "user_id", owner: string, seconds: number) {
  await db.asOwner(
    `insert into study_logs (id, ${column}, subject, started_at, ended_at)
     values (gen_random_uuid(), $1, '数学', now() - make_interval(secs => $2), now())`,
    [owner, seconds],
  );
}

async function answer(owner: string, isCorrect: boolean): Promise<void> {
  const card = randomUUID();
  await db.asOwner(
    `insert into quiz_cards (id, device_id, subject, question, answer)
     values ($1, $2, '数学', 'q', 'a')`,
    [card, owner],
  );
  await db.asOwner(
    `insert into answer_logs (id, device_id, card_id, user_answer, is_correct, answered_at)
     values (gen_random_uuid(), $1, $2, 'a', $3, now())`,
    [owner, card, isCorrect],
  );
}

/** 天井を試すため、上限を通さずに、ウルトラレア未満を過去に count 回引いたことにする。 */
async function pastPulls(user: string, count: number): Promise<void> {
  await db.asOwner("alter table gacha_pulls disable trigger gacha_pulls_limit");
  try {
    await db.asOwner(
      `insert into gacha_pulls (user_id, batch_id, seq, item_id, created_at)
       select $1, gen_random_uuid(), 1, 'dungeon-n1', now() - interval '2 days'
       from generate_series(1, $2::int)`,
      [user, count],
    );
  } finally {
    await db.asOwner("alter table gacha_pulls enable trigger gacha_pulls_limit");
  }
}

const pullCount = async (column: "device_id" | "user_id", owner: string) =>
  Number(
    (
      await db.asOwner(
        `select count(*) as n from gacha_pulls where ${column} = $1`,
        [owner],
      )
    )[0]?.n,
  );

describe("景品の表", () => {
  it("レアリティが、src/domain/gacha.ts と同じ", async () => {
    const rows = await db.asOwner(
      "select id, rank, weight from gacha_rarities order by rank",
    );
    expect(rows).toEqual(
      GACHA_RARITIES.map(({ id, weight }) => ({
        id,
        rank: rarityRank(id),
        weight,
      })),
    );
  });

  it("景品が、すべての世界線に12枠ずつある", async () => {
    const rows = await db.asOwner(
      "select id, world_id, rarity from gacha_items order by id",
    );
    const expected = WORLD_IDS.flatMap((world) =>
      GACHA_SLOTS.map(({ slot, rarity }) => ({
        id: gachaItemId(world, slot),
        world_id: world,
        rarity,
      })),
    ).sort((a, b) => (a.id < b.id ? -1 : 1));
    expect(rows).toEqual(expected);
  });
});

describe("くじ", () => {
  const rarityFor = async (floor: string, roll: number) =>
    (
      await db.asOwner("select gacha_rarity_for($1, $2) as id", [floor, roll])
    )[0]?.id;

  it.each(["n", TEN_PULL_FLOOR, PITY_FLOOR] as const)(
    "%s 以上から引くとき、境目が提供割合のとおり",
    async (floor) => {
      let start = 0;
      for (const { id, percent } of rarityRates(floor)) {
        expect(await rarityFor(floor, start / 100)).toBe(id);
        const end = start + percent;
        expect(await rarityFor(floor, end / 100 - 1e-9)).toBe(id);
        start = end;
      }
    },
  );

  it("たくさん引くと、提供割合に近くなる", async () => {
    const rows = await db.asOwner(
      `select id, count(*)::int as n
       from (select gacha_rarity_for('n', random()) as id
             from generate_series(1, 100000)) picked
       group by id`,
    );
    for (const { id, percent } of rarityRates()) {
      const n = Number(rows.find((row) => row.id === id)?.n ?? 0);
      expect(Math.abs(n / 1000 - percent)).toBeLessThan(Math.max(0.5, percent * 0.1));
    }
  });

  it.each([
    [GACHA_PITY - 2, 1, 1, false, "n"],
    [GACHA_PITY - 1, 1, 1, false, PITY_FLOOR],
    [GACHA_PITY - 1, 10, 10, false, PITY_FLOOR],
    [0, 10, 9, false, "n"],
    [0, 10, 10, false, TEN_PULL_FLOOR],
    [0, 10, 10, true, "n"],
    [0, 1, 1, false, "n"],
  ])(
    "これまで%d回・%d連の%d回目・SR以上%s → %s 以上",
    async (sinceTop, count, seq, hasSuper, floor) => {
      const [row] = await db.asOwner(
        "select gacha_min_rarity($1, $2, $3, $4) as id",
        [sinceTop, count, seq, hasSuper],
      );
      expect(row?.id).toBe(floor);
    },
  );
});

describe("券", () => {
  it("経験値60ごとに1枚。数え方が src/domain/gacha.ts と同じ", async () => {
    await study("device_id", device, 29 * 60 + 59);
    expect(await deviceStatus(device)).toMatchObject({ earned: 0 });
    await answer(device, false);
    expect(await deviceStatus(device)).toMatchObject({ earned: 0 });
    await answer(device, true);
    expect(await deviceStatus(device)).toMatchObject({
      earned: ticketsEarned({ studySeconds: 29 * 60 + 59, correctCount: 1 }),
    });
    expect(ticketsEarned({ studySeconds: 29 * 60 + 59, correctCount: 1 })).toBe(1);
  });

  it("引いた分だけ減り、足りなければ1枚も記録しない", async () => {
    await study("device_id", device, 30 * 60);
    expect((await devicePull(device, "cafe", 10)).error).toBe("not_enough_tickets");
    expect(await pullCount("device_id", device)).toBe(0);

    const { rows } = await devicePull(device, "cafe", 1);
    expect(rows).toHaveLength(1);
    expect(await deviceStatus(device)).toMatchObject({ earned: 1, spent: 1 });
    expect((await devicePull(device, "cafe", 1)).error).toBe("not_enough_tickets");
  });

  it("単発か10連で、ある世界線だけを引ける", async () => {
    await study("device_id", device, 10 * 60 * 60);
    for (const [world, count, error] of [
      ["cafe", 2, "invalid_count"],
      ["cafe", 0, "invalid_count"],
      ["mars", 1, "invalid_world"],
    ] as const) {
      expect((await devicePull(device, world, count)).error).toBe(error);
    }
    expect((await devicePull(null, "cafe", 1)).error).toBe("invalid_owner");
    expect(await pullCount("device_id", device)).toBe(0);
  });
});

describe("引く", () => {
  it("10連は、選んだ世界線から順に10枚で、SR以上を必ず含む", async () => {
    await study("user_id", alice, 900 * 60 * 60);
    for (let round = 0; round < ROW_LIMITS.gacha_pulls.count / 10; round += 1) {
      await db.asOwner("select setseed($1)", [round / 10]);
      const { rows, error } = await userPull(alice, "dungeon", 10);
      expect(error).toBeNull();
      expect(rows.map((row) => row.seq)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      for (const row of rows) expect(String(row.item_id)).toMatch(/^dungeon-/);
      expect(rows.some((row) => SUPER.includes(String(row.rarity)))).toBe(true);
    }
  });

  it(`1日${ROW_LIMITS.gacha_pulls.count}回まで。超える分は記録しない`, async () => {
    await study("user_id", alice, 900 * 60 * 60);
    const limit = ROW_LIMITS.gacha_pulls.count;
    for (let pulled = 0; pulled < limit - 5; pulled += 1) {
      await userPull(alice, "cafe", 1);
    }
    expect((await userPull(alice, "cafe", 10)).error).toBe(ROW_LIMIT_MESSAGE);
    expect(await pullCount("user_id", alice)).toBe(limit - 5);
  });

  it(`ウルトラレア以上が出ないまま${GACHA_PITY}回目で、ウルトラレア以上が出る`, async () => {
    await study("user_id", alice, 900 * 60 * 60);
    await pastPulls(alice, GACHA_PITY - 1);
    expect(await userStatus(alice)).toMatchObject({ since_top: GACHA_PITY - 1 });

    const { rows } = await userPull(alice, "dungeon", 1);
    expect(TOP).toContain(rows[0]?.rarity);
    expect(await userStatus(alice)).toMatchObject({ since_top: 0 });
  });

  it("10連の途中で天井に届いたら、その後は数え直す", async () => {
    await study("user_id", alice, 900 * 60 * 60);
    await pastPulls(alice, GACHA_PITY - 1);
    const { rows } = await userPull(alice, "dungeon", 10);
    expect(TOP).toContain(rows[0]?.rarity);
    // 残り9枚がすべてウルトラレア以上になるのは、まず起きない。
    expect(rows.filter((row) => TOP.includes(String(row.rarity))).length).toBeLessThan(10);
  });
});

describe("持ち主", () => {
  it("本人の記録だけを読め、他人や端末の分は数えない", async () => {
    await study("user_id", alice, 60 * 60);
    await study("device_id", device, 60 * 60);
    await userPull(alice, "cafe", 1);
    await devicePull(device, "cafe", 1);

    expect(await userStatus(bob)).toEqual({ earned: 0, spent: 0, since_top: 0 });
    expect(await db.as({ user: bob }, "select * from gacha_pulls")).toEqual([]);
    expect(await db.as({ user: bob }, "select * from my_gacha_collection()")).toEqual([]);
    expect(await userStatus(alice)).toEqual({ earned: 2, spent: 1, since_top: 1 });

    const mine = await db.as({ user: alice }, "select * from my_gacha_collection()");
    expect(mine).toHaveLength(1);
    expect(mine[0]?.copies).toBe(1);
    const onDevice = await db.as("service_role", "select * from gacha_collection($1)", [device]);
    expect(onDevice).toHaveLength(1);
  });

  it("同じ景品は、まとめて数える", async () => {
    await pastPulls(alice, 3);
    expect(await db.as({ user: alice }, "select * from my_gacha_collection()")).toEqual([
      { item_id: "dungeon-n1", copies: 3 },
    ]);
  });

  it("記録を直接は足せず、書き換えも消すこともできない", async () => {
    await pastPulls(alice, 1);
    for (const actor of [{ user: alice }, "service_role"] as const) {
      const insert = await attempt(
        actor,
        `insert into gacha_pulls (user_id, batch_id, seq, item_id)
         values ($1, gen_random_uuid(), 1, 'cafe-pr1')`,
        [alice],
      );
      expect(insert.error).toMatch(/permission denied/);
      const update = await attempt(actor, "update gacha_pulls set item_id = 'cafe-pr1'");
      expect(update.error).toMatch(/permission denied/);
      const remove = await attempt(actor, "delete from gacha_pulls");
      expect(remove.error).toMatch(/permission denied/);
    }
    expect(await db.asOwner("select item_id from gacha_pulls")).toEqual([
      { item_id: "dungeon-n1" },
    ]);
  });

  it("引き継ぐと、ガチャの記録も利用者に移る", async () => {
    await study("device_id", device, 60 * 60);
    await devicePull(device, "cafe", 1);
    await db.as("service_role", "select * from claim_device_records($1, $2)", [
      device,
      alice,
    ]);
    expect(await userStatus(alice)).toEqual({ earned: 2, spent: 1, since_top: 1 });
    expect(await deviceStatus(device)).toEqual({ earned: 0, spent: 0, since_top: 0 });
  });
});
