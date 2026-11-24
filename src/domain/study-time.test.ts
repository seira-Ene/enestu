import { describe, expect, it } from "vitest";
import {
  elapsedSeconds,
  filterTodayLogs,
  formatClock,
  formatDuration,
  formatJstTime,
  jstDayRange,
  sumTodaySeconds,
  type StudyLog,
} from "./study-time";

function log(endedAt: string, durationSeconds: number): StudyLog {
  return {
    id: endedAt,
    subject: "数学",
    startedAt: new Date(
      Date.parse(endedAt) - durationSeconds * 1000,
    ).toISOString(),
    endedAt,
    durationSeconds,
  };
}

describe("jstDayRange", () => {
  it("日本時間の0時から24時までを返す", () => {
    const { start, end } = jstDayRange(new Date("2026-11-24T03:00:00Z"));
    expect(start.toISOString()).toBe("2026-11-23T15:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-24T15:00:00.000Z");
  });

  it("日本時間の0時ちょうどで日付が変わる", () => {
    const before = jstDayRange(new Date("2026-11-24T14:59:59.999Z"));
    const after = jstDayRange(new Date("2026-11-24T15:00:00.000Z"));
    expect(after.start).toEqual(before.end);
  });
});

describe("今日の記録", () => {
  const now = new Date("2026-11-24T03:00:00Z"); // 日本時間 11/24 12:00

  it("記録がなければ0秒", () => {
    expect(sumTodaySeconds([], now)).toBe(0);
  });

  it("今日の記録だけを合計する", () => {
    const logs = [
      log("2026-11-24T01:00:00Z", 600),
      log("2026-11-24T02:00:00Z", 45),
      log("2026-11-22T02:00:00Z", 9999),
    ];
    expect(sumTodaySeconds(logs, now)).toBe(645);
  });

  it("開始境界は含み、終了境界は含まない", () => {
    const logs = [
      log("2026-11-23T14:59:59Z", 1),
      log("2026-11-23T15:00:00Z", 10),
      log("2026-11-24T14:59:59Z", 100),
      log("2026-11-24T15:00:00Z", 1000),
    ];
    expect(sumTodaySeconds(logs, now)).toBe(110);
  });

  it("日をまたいだ学習は、終了した日に全時間を数える", () => {
    const overnight = log("2026-11-23T15:30:00Z", 3600); // 23:30〜0:30
    expect(filterTodayLogs([overnight], now)).toHaveLength(1);
    expect(sumTodaySeconds([overnight], now)).toBe(3600);
  });

  it("Supabaseが返す +00:00 形式の時刻も扱える", () => {
    expect(
      sumTodaySeconds([log("2026-11-24T01:00:00.123456+00:00", 30)], now),
    ).toBe(30);
  });
});

describe("elapsedSeconds", () => {
  const startedAt = "2026-11-24T03:00:00.000Z";

  it("1秒未満を切り捨てる", () => {
    expect(
      elapsedSeconds(startedAt, new Date("2026-11-24T03:00:01.999Z")),
    ).toBe(1);
  });

  it("開始時刻より前なら0", () => {
    expect(
      elapsedSeconds(startedAt, new Date("2026-11-24T02:59:59.000Z")),
    ).toBe(0);
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "0秒"],
    [59, "59秒"],
    [60, "1分0秒"],
    [65, "1分5秒"],
    [3599, "59分59秒"],
    [3600, "1時間0分0秒"],
    [3661, "1時間1分1秒"],
    [86400, "24時間0分0秒"],
    [1.9, "1秒"],
    [-5, "0秒"],
    [Number.NaN, "0秒"],
  ])("%s秒 → %s", (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});

describe("formatClock", () => {
  it.each([
    [0, "00:00:00"],
    [61, "00:01:01"],
    [3661, "01:01:01"],
    [360000, "100:00:00"],
  ])("%s秒 → %s", (seconds, expected) => {
    expect(formatClock(seconds)).toBe(expected);
  });
});

describe("formatJstTime", () => {
  it("UTCを日本時間の時分にする", () => {
    expect(formatJstTime("2026-11-24T05:05:59Z")).toBe("14:05");
    expect(formatJstTime("2026-11-24T15:00:00+00:00")).toBe("00:00");
  });
});
