import type { WorldTheme } from "./types";

export const dungeon = {
  id: "dungeon",
  displayName: "ダンジョンRPG",
  tagline: "知識の迷宮を、灯りを頼りに攻略する。",
  colors: {
    primary: "#f2b84b",
    background: "#14121f",
    surface: "#221e33",
    text: "#f3eefc",
    accent: "#6fd3c7",
  },
  decor: {
    colorScheme: "dark",
    radius: "0px",
    buttonRadius: "0px",
    panelBorder: "4px double var(--theme-primary)",
    panelShadow: "0 0 0 4px var(--theme-background)",
    buttonShadow: "inset -4px -4px 0 rgb(0 0 0 / 0.3)",
    ornament: "◆",
  },
  character: {
    name: "リュカ",
    introduction: "知識の迷宮を案内する、見習いの灯守り。",
    images: {
      face: "/characters/dungeon-face.webp",
      scene: "/characters/dungeon-scene.webp",
      banner: "/characters/dungeon-banner.webp",
    },
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
    navTimer: "冒険",
    navCards: "巻物",
    navQuiz: "番人戦",
    navStats: "地図",
    navNotes: "手記",
  },
  quiz: {
    terms: {
      card: "知識の巻物",
      addCard: "巻物に記す",
      start: "番人に挑む",
      retry: "もう一度挑む",
      answerHistory: "戦いの記録",
    },
    cheers: {
      setup: [
        "巻物の知識で、迷宮の番人に挑もう。",
        "準備はいい？ ぼくがそばで照らしているよ。",
      ],
      start: [
        "番人が現れた！ 落ち着いて答えていこう。",
        "さあ、思い出してみて。きみなら届くよ。",
      ],
      correct: ["命中！ その調子だよ。", "やった、番人がひるんだよ！"],
      incorrect: [
        "惜しい！ ここは覚えて、次で取り返そう。",
        "だいじょうぶ。まちがえた所ほど強くなれるよ。",
      ],
      perfect: [
        "全問正解！ 番人を倒したよ！",
        "かんぺき！ 今日のきみは伝説の冒険者だ。",
      ],
      good: [
        "いい戦いだった！ あと少しで倒せるよ。",
        "番人はもうふらふらだ。もう一息！",
      ],
      retry: [
        "今日はここまで戦えたね。もう一度挑めば、きっと届くよ。",
        "戦いの記録は残ったよ。巻物を読み直して、また行こう。",
      ],
    },
    stage: {
      name: "迷宮の番人",
      clearedMessage: "番人を撃破！",
      gaugeLabel: "番人の体力",
      gaugeDirection: "drain",
    },
  },
  quest: {
    title: "今日のクエスト",
    start: "クエストに挑む",
    lines: {
      weak: "「{subject}」の階層に手ごわい番人がいるよ。今日はここを攻略しよう。",
      neglected: "「{subject}」の階層に、しばらく灯りが届いていないよ。少しだけ探索しよう。",
      starter: "まずは巻物を3問解いてみよう。きみの得意と苦手が見えてくるよ。",
      clear: "手ごわい階層は見当たらないよ。今日は好きな場所を探索しよう。",
      achieved: "クエスト達成！ 今日のきみの灯りは、ひときわ明るいね。",
    },
  },
  progress: {
    label: "冒険者レベル",
    levelUp: "レベルアップ！",
    combo: "{count}連撃！",
    ranks: [
      "駆け出しの探索者",
      "灯りの見習い",
      "迷宮の歩き手",
      "階層の守り手",
      "伝説の灯守り",
    ],
    stories: [
      "はじめまして。ぼくはリュカ。きみの灯りになれるように、がんばるよ。",
      "実はぼく、暗いところが苦手だったんだ。でも、きみが一緒だと平気みたい。",
      "この迷宮は、誰かが忘れた知識でできているんだって。きみが拾うと、道が光るんだよ。",
      "番人たちはね、意地悪で立ちはだかるんじゃない。覚えていてほしいだけなんだ。",
      "もう、ぼくが照らさなくても大丈夫だね。……でも、これからも隣を歩いていいかな。",
    ],
  },
} as const satisfies WorldTheme;
