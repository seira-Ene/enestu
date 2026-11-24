import type { WorldTheme } from "./types";

export const cafe = {
  id: "cafe",
  displayName: "カフェ",
  tagline: "湯気のそばで、のんびり少しずつ。",
  colors: {
    primary: "#6f4424",
    background: "#f3e6d0",
    surface: "#fffaf0",
    text: "#463020",
    accent: "#4d5f27",
  },
  decor: {
    colorScheme: "light",
    radius: "18px",
    buttonRadius: "18px",
    panelBorder: "2px dashed #cda77c",
    panelShadow: "0 0 0 6px var(--theme-surface), 0 8px 16px rgb(111 68 36 / 0.22)",
    buttonShadow: "0 3px 0 #4a2b14",
    ornament: "☕︎",
  },
  character: {
    name: "モカ",
    introduction: "のんびり屋だけど、味には妥協しない店員。",
    images: null,
  },
  cheers: {
    welcome: [
      "いらっしゃい。いつもの席、空いてるよ。",
      "今日もお疲れさま。まずは深呼吸しよっか。",
    ],
    timerStart: [
      "はーい、仕込み開始。ことこといこうね。",
      "お湯が沸くまで、ちょっとだけ集中しよう。",
    ],
    timerStop: [
      "お疲れさま。あったかいの、淹れておいたよ。",
      "いい香りがしてきたね。ひと休みしよう。",
    ],
    dailyTotal: [
      "今日は{minutes}分もじっくり煮込めたね。",
      "{minutes}分の仕込み、きっとおいしくなるよ。",
    ],
  },
  terms: {
    subject: "今日の仕込み",
    studySession: "仕込み",
    startTimer: "仕込みを始める",
    stopTimer: "ひと休みする",
    todayTotal: "今日の仕込み時間",
    history: "仕込みの記録",
    navTimer: "厨房",
    navCards: "レシピ",
    navQuiz: "開店",
    navStats: "帳簿",
  },
  quiz: {
    terms: {
      card: "レシピカード",
      addCard: "レシピに書く",
      start: "お店を開ける",
      retry: "もう一度開店する",
      answerHistory: "接客の記録",
    },
    cheers: {
      setup: [
        "そろそろ開店の時間だよ。レシピは覚えた？",
        "お客さまが待ってるよ。準備できたら教えてね。",
      ],
      start: [
        "ご注文が入ったよ。ゆっくり思い出してね。",
        "あわてなくていいよ。おいしいのを作ろう。",
      ],
      correct: ["わあ、ばっちり。お客さま笑顔だよ。", "うん、その味。完璧だね。"],
      incorrect: [
        "ありゃ、ちょっと焦げちゃった。作り直そう。",
        "だいじょうぶ。レシピをもう一度見てみよっか。",
      ],
      perfect: [
        "満席で、みんな大満足。今日は看板の日だね。",
        "ぜんぶ大正解。特製ケーキ、ごちそうするね。",
      ],
      good: [
        "いい一日だったね。あとひと工夫で完璧だよ。",
        "常連さんが増えそう。もう少しだね。",
      ],
      retry: [
        "今日は早じまい。また明日、ゆっくりやろう。",
        "仕込み直せば大丈夫。一緒にやろうね。",
      ],
    },
    stage: {
      name: "本日のお客さま",
      clearedMessage: "お客さまが大満足！",
      gaugeLabel: "お客さまの満足度",
      gaugeDirection: "fill",
    },
  },
  quest: {
    title: "本日のおすすめ",
    start: "おすすめを試す",
    lines: {
      weak: "「{subject}」の味が、まだ決まらないみたい。今日はここを磨こう。",
      neglected: "「{subject}」、しばらく作ってないね。少しだけ仕込もっか。",
      starter: "まずは3問、味見してみて。きみの得意がわかるよ。",
      clear: "どの味もいい感じ。今日は好きなものを作ろう。",
      achieved: "おすすめ、完成。とってもいい味だよ。",
    },
  },
} as const satisfies WorldTheme;
