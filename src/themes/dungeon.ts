import type { WorldTheme } from "./types";

export const dungeon = {
  id: "dungeon",
  displayName: "ダンジョンRPG",
  colors: {
    primary: "#f2b84b",
    background: "#14121f",
    surface: "#221e33",
    text: "#f3eefc",
    accent: "#6fd3c7",
  },
  character: {
    name: "リュカ",
    introduction: "知識の迷宮を案内する、見習いの灯守り。",
  },
  cheers: {
    welcome: [
      "来てくれたんだね。今日はどの階層から行こうか？",
      "灯りはともしておいたよ。一歩だけでも進んでみよう。",
    ],
    timerStart: [
      "冒険開始！ 足もとはぼくが照らすよ。",
      "よし、出発だ。ゆっくりでも前に進めばいい。",
    ],
    timerStop: [
      "おかえり！ 今日の冒険もちゃんと記録しておいたよ。",
      "無事に帰還だね。ひと休みしていこう。",
    ],
    dailyTotal: [
      "今日は{minutes}分も迷宮を進んだよ。すごい！",
      "{minutes}分ぶん、灯りが強くなったよ。",
    ],
  },
  terms: {
    subject: "探索する階層",
    studySession: "冒険",
    startTimer: "冒険に出る",
    stopTimer: "帰還する",
    todayTotal: "今日の探索時間",
    history: "冒険の記録",
  },
} as const satisfies WorldTheme;
