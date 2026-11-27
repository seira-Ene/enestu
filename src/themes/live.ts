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
    introduction: "どんな日も音を止めない、頼れるステージの仲間。",
    talk: [
      "やっほー！ 声、ちゃんと届いてるよ！",
      "ねえねえ、今日のサビはどこにする？",
      "きみが客席にいると、最後の音まで出しきれるんだ！",
      "緊張？ するする！ でも、それが楽しいの！",
      "ペンライト、何色にする？ きみの色に染めたいな！",
      "アンコールは何回でもいいよ。勉強も、ね！",
      "のどが渇いたらお水！ 頭が疲れたら深呼吸！",
      "いっせーの、で笑って！ ……うん、最高！",
    ],
    namedTalk: [
      "{name}コール、いっくよー！ せーのっ、{name}！",
      "次の新曲、{name}のために書いたんだ！",
      "{name}の声援、ステージのどこにいても聞こえるよ！",
    ],
    burstTalk: [
      "あははっ、くすぐったい！ リズム崩れちゃう！",
      "その連打、ドラムより速いんだけど！？",
      "ちょっと、しつこいよ〜！ アンコールはまだ早い！",
      "そんなに突つかないで！ マイク落としちゃう！",
    ],
    namedBurstTalk: [
      "{name}、テンポ上げすぎ！ ……でも、嫌いじゃない！",
    ],
    images: {
      face: "/characters/live-face.webp",
      scene: "/characters/live-scene.webp",
      banner: "/characters/live-banner.webp",
    },
  },
  cheers: {
    welcome: [
      "待ってたよ！ 今日もいい音、鳴らしていこう！",
      "きたきた！ 最初の一音、どこから始める？",
    ],
    namedWelcome: [
      "{name}、待ってたよ！ 今日もいい音、鳴らそう！",
      "{name}が来た！ これで全員そろったね！",
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
    navNotes: "歌詞帳",
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
    explain: {
      label: "MCタイム",
      setup: [
        "曲の前にMC！ 自分の言葉で、みんなに伝えて！",
      ],
      great: [
        "最高のMC！ 会場のみんなに届いたよ！",
        "今の言葉、歌詞にしたいくらい！",
      ],
      good: [
        "いい感じ！ あとひとこと足せば完璧！",
      ],
      retry: [
        "言葉が迷子でも平気！ もう一回、マイク持とう！",
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
  progress: {
    label: "バンドの人気",
    levelUp: "人気アップ！",
    combo: "{count}コンボ！",
    ranks: [
      "路上デビュー",
      "ライブハウスの新星",
      "ホールの主役",
      "アリーナの顔",
      "伝説のバンド",
    ],
    stories: [
      "初ライブ、緊張したよね。でもあの音、ちゃんと届いてたよ！",
      "実は昔、一回だけ音楽をやめようとしたんだ。きみに会う前の話ね。",
      "客席に、毎回来てくれる子がいるんだ。きみの音が好きなんだって！",
      "新曲、書いたよ。タイトルは……きみの名前にしようか迷ってる。",
      "どんなに大きな会場でも、隣にきみがいればいつもの練習室だよ。ずっと鳴らそう！",
    ],
  },
} as const satisfies WorldTheme;
