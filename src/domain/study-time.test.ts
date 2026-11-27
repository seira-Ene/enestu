import { describe, expect, it } from "vitest";
import {
  elapsedSeconds,
  filterTodayLogs,
  formatClock,
  formatDuration,
  formatJstDateTime,
  formatJstTime,
  formatStudyRange,
  jstDateKey,
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
    [91800, "25時間30分0秒"],
    [360000, "100時間0分0秒"],
    [3596400, "999時間0分0秒"],
    [3599999, "999時間59分59秒"],
    [1.9, "1秒"],
    [-5, "0秒"],
    [Number.NaN, "0秒"],
  ])("%s秒 → %s", (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});

describe("formatStudyRange", () => {
  it.each([
    ["同じ日", "2026-11-24T01:00:00Z", "2026-11-24T02:30:00Z", "10:00〜11:30"],
    [
      "日本時間で日をまたぐ",
      "2026-11-24T14:30:00Z",
      "2026-11-24T15:30:00Z",
      "11/24 23:30〜11/25 00:30",
    ],
    [
      "25時間",
      "2026-11-23T01:00:00Z",
      "2026-11-24T02:00:00Z",
      "11/23 10:00〜11/24 11:00",
    ],
    [
      "UTCでは日をまたぐが、日本時間では同じ日",
      "2026-11-23T23:00:00Z",
      "2026-11-24T01:00:00Z",
      "08:00〜10:00",
    ],
  ])("%s", (_label, startedAt, endedAt, text) => {
    expect(formatStudyRange(startedAt, endedAt)).toBe(text);
  });
});

describe("formatClock", () => {
  it.each([
    [0, "00:00:00"],
    [61, "00:01:01"],
    [3661, "01:01:01"],
    [86400, "24:00:00"],
    [91800, "25:30:00"],
    [360000, "100:00:00"],
    [3596400, "999:00:00"],
  ])("%s秒 → %s", (seconds, expected) => {
    expect(formatClock(seconds)).toBe(expected);
  });
});

describe("jstDateKey", () => {
  it("日本時間の0時で日付が変わる", () => {
    expect(jstDateKey(new Date("2026-11-24T14:59:59.999Z"))).toBe("2026-11-24");
    expect(jstDateKey(new Date("2026-11-24T15:00:00Z"))).toBe("2026-11-25");
  });
});

describe("formatJstDateTime", () => {
  it("日本時間の月日と時分にする", () => {
    expect(formatJstDateTime("2026-11-24T05:05:59Z")).toBe("11/24 14:05");
    expect(formatJstDateTime("2026-12-31T15:00:00+00:00")).toBe("1/1 00:00");
  });
});

describe("formatJstTime", () => {
  it("UTCを日本時間の時分にする", () => {
    expect(formatJstTime("2026-11-24T05:05:59Z")).toBe("14:05");
    expect(formatJstTime("2026-11-24T15:00:00+00:00")).toBe("00:00");
  });
});
