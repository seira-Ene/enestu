import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  ALL_CLEAR_REWARD,
  dailyDay,
  LOGIN_REWARD,
  MISSIONS,
  STREAK_BONUS_EVERY,
  STREAK_BONUS_REWARD,
  type MissionKind,
} from "@/domain/daily";
import { TestDb, type Actor, type Row } from "./test-db";

/** ログインボーナスとミッションが、決めた条件と報酬で、1日1回だけ受け取れること。 */

let db: TestDb;
let alice: string;
let device: string;
let today: string;

beforeAll(async () => {
  db = await TestDb.create();
});

beforeEach(async () => {
  await db.clear();
  alice = await db.createUser();
  device = randomUUID();
  today = String((await db.asOwner("select daily_day(now())::text as d"))[0]?.d);
});

afterAll(async () => {
  await db.close();
});

const goal = (kind: MissionKind) =>
  MISSIONS.find((mission) => mission.kind === kind)?.goal ?? 0;
const reward = (kind: MissionKind) =>
  MISSIONS.find((mission) => mission.kind === kind)?.reward;

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

const claim = (kind: string, world = "cafe", id: string = device) =>
  attempt("service_role", "select * from daily_claim($1, $2, $3)", [id, kind, world]);
const userClaim = (user: string, kind: string, world = "cafe") =>
  attempt({ user }, "select * from my_daily_claim($1, $2)", [kind, world]);

async function deviceStatus(id: string = device): Promise<Row | undefined> {
  return (
    await db.as(
      "service_role",
      `select day::text, claimed, study_seconds, answers, explanations, streak,
              last_visit::text
       from daily_status($1)`,
      [id],
    )
  )[0];
}
async function userStatus(user: string): Promise<Row | undefined> {
  return (
    await db.as(
      { user },
      "select streak, last_visit::text, claimed from my_daily_status()",
    )
  )[0];
}

/** 利用者が、今日より前の days 日（1日前〜days日前）にログインボーナスを受け取ったことにする。 */
async function pastLogins(user: string, days: readonly number[]): Promise<void> {
  for (const ago of days) {
    await db.asOwner(
      `insert into daily_claims (user_id, day, kind, tickets)
       values ($1, $2::date - $3::int, 'login', 1)`,
      [user, today, ago],
    );
  }
}

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, index) => from + index);

async function study(seconds: number, createdAgo = "0 seconds"): Promise<void> {
  await db.asOwner(
    `insert into study_logs (id, device_id, subject, started_at, ended_at, created_at)
     values (gen_random_uuid(), $1, '数学', now() - make_interval(secs => $2),
             now(), now() - $3::interval)`,
    [device, seconds, createdAgo],
  );
}

async function answers(count: number): Promise<void> {
  const card = randomUUID();
  await db.asOwner(
    `insert into quiz_cards (id, device_id, subject, question, answer)
     values ($1, $2, '数学', 'q', 'a')`,
    [card, device],
  );
  await db.asOwner(
    `insert into answer_logs (id, device_id, card_id, user_answer, is_correct, answered_at)
     select gen_random_uuid(), $1, $2, 'a', false, now() from generate_series(1, $3::int)`,
    [device, card, count],
  );
}

async function explanation(): Promise<void> {
  const term = randomUUID();
  await db.asOwner(
    `insert into explain_terms (id, device_id, subject, term, keywords)
     values ($1, $2, '理科', '光合成', '{酸素}')`,
    [term, device],
  );
  await db.asOwner(
    `insert into explanation_logs (id, device_id, term_id, body, total_count, missing, explained_at)
     values (gen_random_uuid(), $1, $2, '説明', 1, '{}', now())`,
    [device, term],
  );
}

const earned = async (id: string = device) =>
  Number(
    (await db.as("service_role", "select earned from gacha_status($1)", [id]))[0]
      ?.earned,
  );

describe("日付", () => {
  it.each([
    "2026-11-28T03:59:59+09:00",
    "2026-11-28T04:00:00+09:00",
    "2026-11-27T19:30:00Z",
    "2027-01-01T03:00:00+09:00",
  ])("%s の日が、src/domain/daily.ts と同じ", async (at) => {
    const [row] = await db.asOwner("select daily_day($1::timestamptz)::text as d", [at]);
    expect(row?.d).toBe(dailyDay(new Date(at)));
  });
});

describe("ログインボーナス", () => {
  it("1日1回、券がもらえる", async () => {
    expect(await deviceStatus()).toEqual({
      day: today,
      claimed: [],
      study_seconds: 0,
      answers: 0,
      explanations: 0,
      streak: 0,
      last_visit: null,
    });
    const { rows } = await claim("login");
    expect(rows).toEqual([
      { kind: "login", tickets: LOGIN_REWARD.tickets, item_id: null, streak: 1 },
    ]);
    expect((await claim("login")).error).toBe("already_claimed");
    expect(await earned()).toBe(LOGIN_REWARD.tickets);
  });

  it.each([STREAK_BONUS_EVERY, STREAK_BONUS_EVERY * 2])(
    "%d日連続の日は、報酬が増える",
    async (days) => {
      await pastLogins(alice, range(1, days - 1));
      const { rows } = await userClaim(alice, "login", "dungeon");
      expect(rows[0]).toMatchObject({
        tickets: STREAK_BONUS_REWARD.tickets,
        streak: days,
      });
      expect(String(rows[0]?.item_id)).toMatch(
        new RegExp(`^dungeon-${STREAK_BONUS_REWARD.material}\\d$`),
      );
    },
  );

  it("連続日数を数え、途切れたら1からになる", async () => {
    await pastLogins(alice, [1, 2]);
    expect(await userStatus(alice)).toMatchObject({ streak: 2 });

    const bob = await db.createUser();
    await pastLogins(bob, [3, 4]);
    expect(await userStatus(bob)).toMatchObject({ streak: 0 });
    const { rows } = await userClaim(bob, "login");
    expect(rows[0]).toMatchObject({ streak: 1 });
    expect(await userStatus(bob)).toMatchObject({ streak: 1, claimed: ["login"] });
  });

  it("前回の訪問日を返す", async () => {
    await pastLogins(alice, [3, 9]);
    const [row] = await db.asOwner("select ($1::date - 3)::text as d", [today]);
    expect(await userStatus(alice)).toMatchObject({ last_visit: row?.d });
  });
});

describe("ミッション", () => {
  it("記録が足りなければ、受け取れない", async () => {
    for (const kind of ["study", "answers", "explain", "all_clear"]) {
      expect((await claim(kind)).error).toBe("not_achieved");
    }
    expect((await claim("cheat")).error).toBe("invalid_kind");
    expect((await claim("login", "mars")).error).toBe("invalid_world");
  });

  it("学習は、今日保存した分だけを数える", async () => {
    await study(60 * 60, "1 day");
    expect(await deviceStatus()).toMatchObject({ study_seconds: 0 });
    await study(goal("study") - 1);
    expect((await claim("study")).error).toBe("not_achieved");
    await study(1);
    const { rows } = await claim("study");
    expect(rows[0]).toMatchObject({ tickets: reward("study")?.tickets, item_id: null });
  });

  it("解答と説明で、素材がもらえる", async () => {
    await answers(goal("answers") - 1);
    expect((await claim("answers")).error).toBe("not_achieved");
    await answers(1);
    const answered = await claim("answers", "live");
    expect(String(answered.rows[0]?.item_id)).toMatch(
      new RegExp(`^live-${reward("answers")?.material}\\d$`),
    );

    await explanation();
    const explained = await claim("explain", "live");
    expect(String(explained.rows[0]?.item_id)).toMatch(
      new RegExp(`^live-${reward("explain")?.material}\\d$`),
    );
    expect(
      await db.as("service_role", "select sum(copies)::int as n from gacha_collection($1)", [
        device,
      ]),
    ).toEqual([{ n: 2 }]);
  });

  it("3つとも受け取ると、全部の報酬が受け取れる", async () => {
    await study(goal("study"));
    await answers(goal("answers"));
    await claim("study");
    await claim("answers");
    expect((await claim("all_clear")).error).toBe("not_achieved");
    await explanation();
    await claim("explain");
    const { rows } = await claim("all_clear");
    expect(rows[0]).toMatchObject({ tickets: ALL_CLEAR_REWARD.tickets });
    // 学習15分の経験値（30）では券にならないので、報酬の分だけ。
    expect(await earned()).toBe(
      (reward("study")?.tickets ?? 0) + ALL_CLEAR_REWARD.tickets,
    );
  });
});

describe("持ち主", () => {
  it("記録を直接は足せず、書き換えも消すこともできない", async () => {
    await claim("login");
    for (const actor of [{ user: alice }, "service_role"] as const) {
      const insert = await attempt(
        actor,
        `insert into daily_claims (user_id, day, kind, tickets)
         values ($1, current_date, 'study', 3)`,
        [alice],
      );
      expect(insert.error).toMatch(/permission denied/);
      expect((await attempt(actor, "update daily_claims set tickets = 3")).error).toMatch(
        /permission denied/,
      );
      expect((await attempt(actor, "delete from daily_claims")).error).toMatch(
        /permission denied/,
      );
    }
  });

  it("本人の記録だけを読める", async () => {
    await claim("login");
    await userClaim(alice, "login");
    const bob = await db.createUser();
    expect(await db.as({ user: bob }, "select * from daily_claims")).toEqual([]);
    expect(await db.as({ user: alice }, "select kind from daily_claims")).toEqual([
      { kind: "login" },
    ]);
  });

  it("引き継ぐと利用者に移る。同じ日・同じ種類は、二重にしない", async () => {
    await claim("login");
    await db.asOwner(
      `insert into daily_claims (device_id, day, kind, tickets)
       values ($1, $2::date - 1, 'login', 1)`,
      [device, today],
    );
    await userClaim(alice, "login");
    await db.as("service_role", "select * from claim_device_records($1, $2)", [
      device,
      alice,
    ]);
    expect(await userStatus(alice)).toMatchObject({ streak: 2 });
    expect(
      await db.asOwner("select count(*)::int as n from daily_claims where device_id = $1", [
        device,
      ]),
    ).toEqual([{ n: 1 }]);
  });
});
