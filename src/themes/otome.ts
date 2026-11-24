import type { WorldTheme } from "./types";

export const otome = {
  id: "otome",
  displayName: "乙女ゲーム",
  tagline: "白い城で、王子と過ごす学びの時間。",
  colors: {
    primary: "#9b2247",
    background: "#fce8ee",
    surface: "#fffafb",
    text: "#4a2433",
    accent: "#83397a",
  },
  decor: {
    colorScheme: "light",
    radius: "24px",
    buttonRadius: "9999px",
    panelBorder: "1px solid #e7b3c4",
    panelShadow:
      "inset 0 0 0 5px var(--theme-surface), inset 0 0 0 6px #f0c9d6, 0 6px 18px rgb(155 34 71 / 0.12)",
    buttonShadow: "0 4px 12px rgb(155 34 71 / 0.3)",
    ornament: "❀",
  },
  character: {
    name: "透真",
    introduction: "城でいつも待っていてくれる、穏やかな王子。",
    images: {
      face: "/characters/otome-face.webp",
      scene: "/characters/otome-scene.webp",
      banner: "/characters/otome-banner.webp",
    },
  },
  cheers: {
    welcome: [
      "来てくれたんだね。隣の席、空けておいたよ。",
      "おかえり。今日は何を一緒に学ぼうか。",
    ],
    timerStart: [
      "では始めようか。僕も隣で公務を片づけるよ。",
      "ゆっくりで大丈夫。きみのペースでいこう。",
    ],
    timerStop: [
      "おつかれさま。がんばる横顔、ちゃんと見ていたよ。",
      "今日もここまで来られたね。庭園で少し休もうか。",
    ],
    dailyTotal: [
      "今日は{minutes}分も一緒にいられたね。うれしいな。",
      "{minutes}分の積み重ね、きっときみの力になるよ。",
    ],
  },
  terms: {
    subject: "今日の教科",
    studySession: "書斎の時間",
    startTimer: "一緒に勉強する",
    stopTimer: "今日はここまで",
    todayTotal: "二人で学んだ時間",
    history: "書斎の記録",
    navTimer: "書斎",
    navCards: "しおり",
    navQuiz: "舞踏会",
    navStats: "手帳",
  },
  quiz: {
    terms: {
      card: "思い出のしおり",
      addCard: "しおりに書く",
      start: "舞踏会に出る",
      retry: "もう一曲踊る",
      answerHistory: "舞踏会の記録",
    },
    cheers: {
      setup: [
        "覚えているか、僕が問題を出してみようか。",
        "しおりを開いて。準備ができたら教えてね。",
      ],
      start: [
        "焦らなくていいよ。思い出せるまで待っているから。",
        "ほら、あのとき一緒に学んだところだよ。",
      ],
      correct: ["正解。さすがだね。", "うん、合っているよ。よく覚えていたね。"],
      incorrect: [
        "惜しかったね。ここは一緒に見直そう。",
        "間違えても大丈夫。次はきっと思い出せるよ。",
      ],
      perfect: [
        "全問正解。きみには、いつも驚かされるな。",
        "完璧だよ。……ごほうび、考えておくね。",
      ],
      good: [
        "よくがんばったね。あと少しで満点だよ。",
        "いい調子。もう一度やれば届きそうだ。",
      ],
      retry: [
        "今日はここまで。また明日、隣で待っているよ。",
        "大丈夫。もう一度、一緒にやってみよう。",
      ],
    },
    stage: {
      name: "月夜の舞踏会",
      clearedMessage: "ふたりの距離が縮まった！",
      gaugeLabel: "好感度",
      gaugeDirection: "fill",
    },
  },
  quest: {
    title: "今日の約束",
    start: "約束をかなえる",
    lines: {
      weak: "「{subject}」、少し苦手みたいだね。今日は一緒に克服しよう。",
      neglected: "最近「{subject}」に触れていないね。少しだけ、付き合ってくれる？",
      starter: "まずは3問だけ解いてみて。きみの得意なこと、知りたいな。",
      clear: "苦手はなさそうだね。今日は、きみの好きなことを学ぼう。",
      achieved: "約束、守ってくれたね。ありがとう。",
    },
  },
  progress: {
    label: "ふたりの親密度",
    levelUp: "親密度アップ！",
    combo: "{count}問つづけて正解",
    ranks: [
      "城の客人",
      "気になるひと",
      "秘密の話し相手",
      "特別なひと",
      "かけがえのないひと",
    ],
    stories: [
      "その席、いつも空けておくことにしたんだ。……理由？ 内緒だよ。",
      "きみがいない日は、城がやけに広く感じてね。",
      "この青い宝石、きみに似合うと思って選んだんだ。受け取ってくれる？",
      "難しい顔をしているきみも好きだけど、解けたときの笑顔がいちばんだな。",
      "王子としてではなく、ただの僕として、きみの隣にいたい。……きみは、どう思う？",
    ],
  },
} as const satisfies WorldTheme;
