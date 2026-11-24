import type { WorldTheme } from "./types";

export const live = {
  id: "live",
  displayName: "ライブ",
  tagline: "学びを鳴らして、会場を沸かせる。",
  colors: {
    primary: "#dc86ff",
    background: "#0b0814",
    surface: "#1a1230",
    text: "#f6f0ff",
    accent: "#4de3ff",
  },
  decor: {
    colorScheme: "dark",
    radius: "14px",
    buttonRadius: "14px",
    panelBorder: "1px solid var(--theme-primary)",
    panelShadow:
      "0 0 12px rgb(220 134 255 / 0.45), inset 0 0 16px rgb(77 227 255 / 0.08)",
    buttonShadow: "0 0 18px rgb(220 134 255 / 0.65)",
    ornament: "♪",
  },
  character: {
    name: "ハルカ",
    introduction: "どんな日も音を止めない、頼れるバンド仲間。",
    images: null,
  },
  cheers: {
    welcome: [
      "待ってたよ！ 今日もいい音、鳴らしていこう！",
      "きたきた！ 最初の一音、どこから始める？",
    ],
    timerStart: [
      "ワン、ツー、スリー！ いくよー！",
      "いいね、そのリズム。このまま走ろう！",
    ],
    timerStop: [
      "最高だった！ ばっちり録れてるよ！",
      "おつかれ！ いいリハになったね。",
    ],
    dailyTotal: [
      "今日は{minutes}分も鳴らしたよ！ アツい！",
      "{minutes}分の練習、本番で絶対響くから！",
    ],
  },
  terms: {
    subject: "練習する曲目",
    studySession: "リハーサル",
    startTimer: "リハを始める",
    stopTimer: "リハを終える",
    todayTotal: "今日のリハ時間",
    history: "リハの記録",
    navTimer: "リハ",
    navCards: "セトリ",
    navQuiz: "本番",
    navStats: "楽屋",
  },
  quiz: {
    terms: {
      card: "セットリスト",
      addCard: "セトリに加える",
      start: "ステージに立つ",
      retry: "アンコールに応える",
      answerHistory: "ライブの記録",
    },
    cheers: {
      setup: [
        "客席、もう満員だよ。準備はいい？",
        "セトリは覚えてるよね。ステージで会おう！",
      ],
      start: [
        "幕が上がった！ 思いっきりいこう！",
        "次の曲、いくよ。せーの！",
      ],
      correct: ["決まった！ 歓声やばい！", "今の最高！ 会場が揺れたよ！"],
      incorrect: [
        "音が外れても止まらない！ 次で取り返そう！",
        "ドンマイ！ そこ、あとで合わせよう。",
      ],
      perfect: [
        "完璧なステージ！ アンコールが鳴りやまないよ！",
        "ノーミス！ 今夜は伝説になるね！",
      ],
      good: [
        "いいライブだった！ 次はもっと沸かせよう！",
        "あと一曲決まれば、最高の夜だったね。",
      ],
      retry: [
        "悔しいけど、ここからが本番。もう一回やろう！",
        "今日の音は残ってる。練習してまた立とう。",
      ],
    },
    stage: {
      name: "今夜のステージ",
      clearedMessage: "会場が最高潮！",
      gaugeLabel: "会場の熱気",
      gaugeDirection: "fill",
    },
  },
  quest: {
    title: "今日の課題曲",
    start: "課題曲に挑む",
    lines: {
      weak: "「{subject}」がまだ噛み合ってないね。今日はここを仕上げよう！",
      neglected: "「{subject}」、最近鳴らしてないかも。ちょっと合わせよ！",
      starter: "まずは3問、音合わせしよう。きみの持ち味が見えてくるよ！",
      clear: "苦手な曲なし！ 今日は好きな曲を鳴らそう！",
      achieved: "課題曲クリア！ いい音してたよ！",
    },
  },
} as const satisfies WorldTheme;
