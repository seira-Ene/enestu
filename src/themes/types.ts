/** エネスタが提供する5つの世界線。 */
export const WORLD_IDS = [
  "dungeon",
  "otome",
  "detective",
  "live",
  "cafe",
] as const;

export type WorldId = (typeof WORLD_IDS)[number];

export function isWorldId(value: unknown): value is WorldId {
  return WORLD_IDS.some((id) => id === value);
}

export type HexColor = `#${string}`;

export type ThemeColors = {
  /** 主要なボタンなど。上に載せる文字には background を使う。 */
  readonly primary: HexColor;
  readonly background: HexColor;
  /** カードや入力欄の面。 */
  readonly surface: HexColor;
  readonly text: HexColor;
  /** 強調表示。 */
  readonly accent: HexColor;
};

/** 枠・影など、配色以外の見た目。値はCSSとしてそのまま使う。 */
export type ThemeDecor = {
  readonly colorScheme: "dark" | "light";
  readonly radius: string;
  readonly buttonRadius: string;
  readonly panelBorder: string;
  readonly panelShadow: string;
  readonly buttonShadow: string;
  /** 見出しの前に付ける飾り。 */
  readonly ornament: string;
};

/** キャラクターの表情：ふだん／うれしい／心配。 */
export type CharacterMood = "normal" | "happy" | "worried";

export type ThemeCharacter = {
  readonly name: string;
  readonly introduction: string;
  /**
   * 自前の画像に差し替える場合の、表情ごとのパス（例："/characters/otome.png"）。
   * null なら src/components/characters のSVGを使う。
   */
  readonly images: Readonly<Record<CharacterMood, string>> | null;
};

/** 1つ以上のセリフ。空配列は型エラーになる。 */
export type CheerLines = readonly [string, ...string[]];

/** 合計時間のセリフ。分数を埋め込む {minutes} を必ず含む。 */
export type TotalCheerLine = `${string}{minutes}${string}`;

export type ThemeCheers = {
  readonly welcome: CheerLines;
  readonly timerStart: CheerLines;
  readonly timerStop: CheerLines;
  readonly dailyTotal: readonly [TotalCheerLine, ...TotalCheerLine[]];
};

/** 世界線ごとに呼び方が変わるUI用語。 */
export type ThemeTerms = {
  readonly subject: string;
  readonly studySession: string;
  readonly startTimer: string;
  readonly stopTimer: string;
  readonly todayTotal: string;
  readonly history: string;
  /** 画面下のナビに出す、各画面の呼び方。 */
  readonly navTimer: string;
  readonly navCards: string;
  readonly navQuiz: string;
  readonly navStats: string;
};

export type QuizTerms = {
  readonly card: string;
  readonly addCard: string;
  readonly start: string;
  readonly retry: string;
  readonly answerHistory: string;
};

export type QuizCheers = {
  readonly setup: CheerLines;
  readonly start: CheerLines;
  readonly correct: CheerLines;
  readonly incorrect: CheerLines;
  /** 結果：全問正解／あと少し／もう一度。 */
  readonly perfect: CheerLines;
  readonly good: CheerLines;
  readonly retry: CheerLines;
};

/** テストの演出。正解するほどゲージが動き、全問正解で達成になる。 */
export type QuizStageTheme = {
  readonly name: string;
  readonly clearedMessage: string;
  readonly gaugeLabel: string;
  /** drain は減っていく（体力など）、fill は増えていく（好感度など）。 */
  readonly gaugeDirection: "drain" | "fill";
};

export type ThemeQuiz = {
  readonly terms: QuizTerms;
  readonly cheers: QuizCheers;
  readonly stage: QuizStageTheme;
};

/** 科目名を埋め込む {subject} を必ず含む。 */
export type SubjectLine = `${string}{subject}${string}`;

/** 今日のクエストの案内文。 */
export type QuestLines = {
  readonly weak: SubjectLine;
  readonly neglected: SubjectLine;
  readonly starter: string;
  readonly clear: string;
  readonly achieved: string;
};

export type ThemeQuest = {
  readonly title: string;
  readonly start: string;
  readonly lines: QuestLines;
};

/** 連続正解の数を埋め込む {count} を必ず含む。 */
export type ComboLine = `${string}{count}${string}`;

type FiveLines = readonly [string, string, string, string, string];

/** レベルの演出。ranks と stories は RANK_LEVELS の順に解放される。 */
export type ThemeProgress = {
  readonly label: string;
  readonly levelUp: string;
  readonly combo: ComboLine;
  readonly ranks: FiveLines;
  readonly stories: FiveLines;
};

export type WorldTheme = {
  readonly id: WorldId;
  readonly displayName: string;
  /** 世界線を選ぶ画面に出す、ひとことの紹介。 */
  readonly tagline: string;
  readonly colors: ThemeColors;
  readonly decor: ThemeDecor;
  readonly character: ThemeCharacter;
  readonly cheers: ThemeCheers;
  readonly terms: ThemeTerms;
  readonly quiz: ThemeQuiz;
  readonly quest: ThemeQuest;
  readonly progress: ThemeProgress;
};
