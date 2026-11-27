import { describe, expect, it } from "vitest";
import {
  canClaim,
  dailyDay,
  daysBetween,
  greetingFor,
  isDailyKind,
  LOGIN_REWARD,
  loginReward,
  MISSED_DAYS,
  missionProgress,
  STREAK_BONUS_REWARD,
  type DailyStatus,
} from "./daily";

const status = (overrides: Partial<DailyStatus> = {}): DailyStatus => ({
  day: "2026-11-28",
  claimed: [],
  studySeconds: 0,
  answers: 0,
  explanations: 0,
  streak: 0,
  lastVisit: null,
  ...overrides,
});

describe("dailyDay", () => {
  it.each([
    ["2026-11-28T03:59:59+09:00", "2026-11-27"],
    ["2026-11-28T04:00:00+09:00", "2026-11-28"],
    ["2026-11-27T19:30:00Z", "2026-11-28"],
    ["2026-12-31T23:59:59+09:00", "2026-12-31"],
    ["2027-01-01T04:00:00+09:00", "2027-01-01"],
  ])("%s は %s", (at, day) => {
    expect(dailyDay(new Date(at))).toBe(day);
  });
});

describe("daysBetween", () => {
  it("月や年をまたいでも数える", () => {
    expect(daysBetween("2026-11-28", "2026-11-28")).toBe(0);
    expect(daysBetween("2026-11-30", "2026-12-03")).toBe(3);
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
  });
});

describe("loginReward", () => {
  it("ふだんは券1枚、7日ごとに券3枚とレアの素材", () => {
    expect(loginReward(1)).toBe(LOGIN_REWARD);
    expect(loginReward(6)).toBe(LOGIN_REWARD);
    expect(loginReward(7)).toBe(STREAK_BONUS_REWARD);
    expect(loginReward(8)).toBe(LOGIN_REWARD);
    expect(loginReward(14)).toBe(STREAK_BONUS_REWARD);
  });
});

describe("greetingFor", () => {
  it(`前回から${MISSED_DAYS}日以上空いたら、さびしがる`, () => {
    expect(greetingFor(status({ lastVisit: "2026-11-26" }))).toBeNull();
    expect(greetingFor(status({ lastVisit: "2026-11-25" }))).toEqual({
      kind: "missed",
      days: 3,
    });
  });

  it("今日で節目の連続日数になれば、喜ぶ", () => {
    expect(greetingFor(status({ streak: 2, lastVisit: "2026-11-27" }))).toEqual({
      kind: "milestone",
      days: 3,
    });
    expect(greetingFor(status({ streak: 3, lastVisit: "2026-11-27" }))).toBeNull();
    expect(greetingFor(status({ streak: 6, lastVisit: "2026-11-27" }))).toEqual({
      kind: "milestone",
      days: 7,
    });
  });

  it("初めての日と、今日もう受け取った後は、何もしない", () => {
    expect(greetingFor(status())).toBeNull();
    expect(
      greetingFor(status({ lastVisit: "2026-11-20", claimed: ["login"] })),
    ).toBeNull();
  });
});

describe("ミッション", () => {
  it("目標に届いたら、受け取れる", () => {
    expect(missionProgress(status({ studySeconds: 899 }), "study")).toEqual({
      current: 899,
      goal: 900,
      isDone: false,
    });
    expect(missionProgress(status({ studySeconds: 5000 }), "study")).toEqual({
      current: 900,
      goal: 900,
      isDone: true,
    });
    expect(canClaim(status({ answers: 4 }), "answers")).toBe(false);
    expect(canClaim(status({ answers: 5 }), "answers")).toBe(true);
    expect(canClaim(status({ explanations: 1 }), "explain")).toBe(true);
  });

  it("受け取った後は、もう受け取れない", () => {
    expect(canClaim(status({ claimed: ["login"] }), "login")).toBe(false);
    expect(
      canClaim(status({ answers: 9, claimed: ["answers"] }), "answers"),
    ).toBe(false);
  });

  it("全部の報酬は、3つとも受け取ってから", () => {
    expect(canClaim(status({ claimed: ["study", "answers"] }), "all_clear")).toBe(
      false,
    );
    expect(
      canClaim(status({ claimed: ["study", "answers", "explain"] }), "all_clear"),
    ).toBe(true);
  });

  it("知らない種類は受け付けない", () => {
    expect(isDailyKind("login")).toBe(true);
    expect(isDailyKind("cheat")).toBe(false);
  });
});
