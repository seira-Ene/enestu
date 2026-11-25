import type { WorldTheme } from "./types";

export const detective = {
  id: "detective",
  displayName: "探偵",
  tagline: "知識という証拠を集め、謎を解き明かす。",
  colors: {
    primary: "#1f4d3a",
    background: "#e9dbbb",
    surface: "#f8efd9",
    text: "#372616",
    accent: "#70400f",
  },
  decor: {
    colorScheme: "light",
    radius: "2px",
    buttonRadius: "2px",
    panelBorder: "1px solid #b79a66",
    panelShadow:
      "0 1px 0 #fff8e6 inset, 3px 4px 0 rgb(112 64 15 / 0.18), 0 8px 18px rgb(55 38 22 / 0.18)",
    buttonShadow: "2px 3px 0 rgb(55 38 22 / 0.45)",
    ornament: "§",
  },
  character: {
    name: "ミチル",
    introduction: "証拠を見逃さない、几帳面な探偵助手。",
    images: {
      face: "/characters/detective-face.webp",
      scene: "/characters/detective-scene.webp",
      banner: "/characters/detective-banner.webp",
    },
  },
  cheers: {
    welcome: [
      "お待ちしていました、先生。本日の案件はこちらです。",
      "先生、資料はそろえてあります。どこから調べましょう。",
    ],
    timerStart: [
      "捜査開始ですね。時刻を記録します。",
      "手がかりは必ずあります。落ち着いていきましょう。",
    ],
    timerStop: [
      "お疲れさまです。捜査記録に残しておきました。",
      "見事な集中力でした。報告書はお任せください。",
    ],
    dailyTotal: [
      "本日の捜査は{minutes}分。真相に近づいています。",
      "{minutes}分の調査で、証拠が増えましたね。",
    ],
  },
  terms: {
    subject: "調査対象",
    studySession: "捜査",
    startTimer: "捜査を始める",
    stopTimer: "捜査を切り上げる",
    todayTotal: "今日の捜査時間",
    history: "捜査の記録",
    navTimer: "捜査",
    navCards: "証拠",
    navQuiz: "推理",
    navStats: "事件簿",
    navNotes: "覚書",
  },
  quiz: {
    terms: {
      card: "証拠カード",
      addCard: "証拠を保管する",
      start: "推理を始める",
      retry: "もう一度推理する",
      answerHistory: "推理の記録",
    },
    cheers: {
      setup: [
        "証拠は出そろいました。先生の推理を聞かせてください。",
        "関係者は集まっています。いつでもどうぞ。",
      ],
      start: [
        "この証拠が示すものは、何でしょうか。",
        "思い込みは禁物です。事実から考えましょう。",
      ],
      correct: ["お見事。つじつまが合いました。", "その推理、間違いありません。"],
      incorrect: [
        "その線は外れのようです。証拠を見直しましょう。",
        "間違いも手がかりのひとつです。記録しておきます。",
      ],
      perfect: [
        "すべての謎が解けました。さすがは先生です。",
        "一点の曇りもない、完璧な推理でした。",
      ],
      good: [
        "真相まであと一歩です。残る謎はわずかですよ。",
        "筋は見えました。もう一度、整理してみましょう。",
      ],
      retry: [
        "今日のところは保留にしましょう。証拠は逃げません。",
        "調べ直せば、必ず見えてきます。",
      ],
    },
    stage: {
      name: "深まる謎",
      clearedMessage: "事件を解決！",
      gaugeLabel: "真相の解明率",
      gaugeDirection: "fill",
    },
  },
  quest: {
    title: "本日の依頼",
    start: "依頼を受ける",
    lines: {
      weak: "「{subject}」の件が難航しています。本日はここを調べましょう。",
      neglected: "「{subject}」の捜査が手薄です。少し足を運びませんか。",
      starter: "まずは証拠を3つ検証してください。先生の得意分野がわかります。",
      clear: "未解決の案件はありません。気になる対象を自由にどうぞ。",
      achieved: "依頼は完了です。見事なお手並みでした。",
    },
  },
  progress: {
    label: "探偵の評判",
    levelUp: "評判が上がりました！",
    combo: "{count}連続で的中",
    ranks: [
      "新米探偵",
      "町の探偵",
      "腕利きの探偵",
      "名探偵",
      "伝説の名探偵",
    ],
    stories: [
      "本日より助手を務めます、ミチルです。先生の記録係はお任せください。",
      "先生は考えごとをすると、紅茶を飲み忘れますね。淹れ直しておきました。",
      "実は、わたしも昔は謎が怖かったのです。先生の推理を見るまでは。",
      "この事件簿、ずいぶん厚くなりました。どの頁も、わたしの宝物です。",
      "先生。最後の謎は、いつまで助手でいられるか、です。……答えは、急ぎませんので。",
    ],
  },
} as const satisfies WorldTheme;
