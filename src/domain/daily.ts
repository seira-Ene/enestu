import { isWorldId, type WorldId } from "@/themes/types";
import type { RarityId } from "./gacha";
import { fail, type ParseResult } from "./validation";

/**
 * ログインボーナスとデイリーミッション。
 * 値は supabase/migrations の daily_day・daily_claim_for と合わせる。
 */

/** 1日は、日本時間のこの時刻に切り替わる。夜ふかしの学習も、その日に数える。 */
export const DAY_START_HOUR = 4;
const JST_OFFSET_HOURS = 9;

export const DAILY_KINDS = [
  "login",
  "study",
  "answers",
  "explain",
  "all_clear",
] as const;
export type DailyKind = (typeof DAILY_KINDS)[number];

/** 受け取れる報酬。経験値は増やさない（レベルは実際の学習量のまま）。 */
export type DailyReward = {
  readonly tickets: number;
  /** もらえる素材のレアリティ。素材がなければ null。 */
  readonly material: RarityId | null;
};

export const LOGIN_REWARD: DailyReward = { tickets: 1, material: null };
/** この日数ごとの連続ログインで、報酬が増える。 */
export const STREAK_BONUS_EVERY = 7;
export const STREAK_BONUS_REWARD: DailyReward = { tickets: 3, material: "r" };

export type MissionKind = Exclude<DailyKind, "login" | "all_clear">;

export const MISSIONS: readonly {
  readonly kind: MissionKind;
  readonly label: string;
  readonly goal: number;
  readonly reward: DailyReward;
}[] = [
  {
    kind: "study",
    label: "15分勉強する",
    goal: 15 * 60,
    reward: { tickets: 1, material: null },
  },
  {
    kind: "answers",
    label: "問題を5問解く",
    goal: 5,
    reward: { tickets: 0, material: "n" },
  },
  {
    kind: "explain",
    label: "用語を1つ説明する",
    goal: 1,
    reward: { tickets: 0, material: "r" },
  },
];

/** 3つのミッションを、すべて受け取ったときの報酬。 */
export const ALL_CLEAR_REWARD: DailyReward = { tickets: 1, material: null };

/** 前回の訪問からこの日数以上空いたら、キャラクターがさびしがる。 */
export const MISSED_DAYS = 3;
/** この連続日数の日に、キャラクターが特別に喜ぶ。 */
export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100] as const;

/** DBが数えた、今日の状態。日付は YYYY-MM-DD。 */
export type DailyStatus = {
  readonly day: string;
  readonly claimed: readonly DailyKind[];
  readonly studySeconds: number;
  readonly answers: number;
  readonly explanations: number;
  /** 今日までの連続日数。今日まだ受け取っていなければ、昨日までの分。 */
  readonly streak: number;
  /** 今日より前で、最後に訪れた日。 */
  readonly lastVisit: string | null;
};

/** その時刻が属する日（YYYY-MM-DD）。 */
export function dailyDay(at: Date): string {
  const shifted = new Date(
    at.getTime() + (JST_OFFSET_HOURS - DAY_START_HOUR) * 60 * 60 * 1000,
  );
  return shifted.toISOString().slice(0, 10);
}

/** 2つの日（YYYY-MM-DD）の間の日数。 */
export function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

/** 今日のログインで、何日連続になり、何がもらえるか。 */
export function loginReward(streakToday: number): DailyReward {
  return streakToday > 0 && streakToday % STREAK_BONUS_EVERY === 0
    ? STREAK_BONUS_REWARD
    : LOGIN_REWARD;
}

/** 今日初めて開いたときの、キャラクターの反応。 */
export type Greeting =
  | { readonly kind: "missed"; readonly days: number }
  | { readonly kind: "milestone"; readonly days: number }
  | null;

/**
 * 前回の訪問から MISSED_DAYS 日以上空いていれば、さびしがる。
 * そうでなく、今日で節目の連続日数になれば、喜ぶ。
 */
export function greetingFor(status: DailyStatus): Greeting {
  if (status.claimed.includes("login")) return null;
  if (status.lastVisit !== null) {
    const gap = daysBetween(status.lastVisit, status.day);
    if (gap >= MISSED_DAYS) return { kind: "missed", days: gap };
  }
  const streakToday = status.streak + 1;
  return STREAK_MILESTONES.some((days) => days === streakToday)
    ? { kind: "milestone", days: streakToday }
    : null;
}

/** ミッションの進み具合。 */
export function missionProgress(
  status: DailyStatus,
  kind: MissionKind,
): { readonly current: number; readonly goal: number; readonly isDone: boolean } {
  const goal = MISSIONS.find((mission) => mission.kind === kind)?.goal ?? 0;
  const current = {
    study: status.studySeconds,
    answers: status.answers,
    explain: status.explanations,
  }[kind];
  return { current: Math.min(current, goal), goal, isDone: current >= goal };
}

/** いま受け取れるか。 */
export function canClaim(status: DailyStatus, kind: DailyKind): boolean {
  if (status.claimed.includes(kind)) return false;
  if (kind === "login") return true;
  if (kind === "all_clear") {
    return MISSIONS.every((mission) => status.claimed.includes(mission.kind));
  }
  return missionProgress(status, kind).isDone;
}

export function isDailyKind(value: unknown): value is DailyKind {
  return DAILY_KINDS.some((kind) => kind === value);
}

/** セリフの {days} に、連続日数を入れる。 */
export function fillDays(line: string, days: number): string {
  return line.split("{days}").join(String(days));
}

/** 受け取った報酬。 */
export type DailyClaim = {
  readonly kind: DailyKind;
  readonly tickets: number;
  /** もらった素材。なければ null。 */
  readonly itemId: string | null;
  readonly streak: number;
};

/** 受け取る種類と、素材を選ぶ世界線。 */
export function parseDailyClaimRequest(
  body: unknown,
): ParseResult<{ readonly kind: DailyKind; readonly world: WorldId }> {
  if (typeof body !== "object" || body === null) {
    return fail("送信内容の形式が正しくありません。");
  }
  const { kind, world }: Partial<Record<"kind" | "world", unknown>> = body;
  if (!isDailyKind(kind)) return fail("受け取る種類が正しくありません。");
  if (!isWorldId(world)) return fail("世界線が正しくありません。");
  return { ok: true, value: { kind, world } };
}
