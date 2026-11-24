import type { CSSProperties } from "react";

/** エネスタが提供する5つの世界線。 */
export const WORLD_IDS = [
  "dungeon",
  "otome",
  "detective",
  "live",
  "cafe",
] as const;

export type WorldId = (typeof WORLD_IDS)[number];

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

export type ThemeCharacter = {
  readonly name: string;
  /** キャラクターの見た目（イラストを用意するまでの仮）。 */
  readonly emoji: string;
  readonly introduction: string;
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
  /** 画面下のナビに出す、3画面の呼び方。 */
  readonly navTimer: string;
  readonly navCards: string;
  readonly navQuiz: string;
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
  readonly emoji: string;
  readonly clearedEmoji: string;
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

export type WorldTheme = {
  readonly id: WorldId;
  readonly displayName: string;
  readonly colors: ThemeColors;
  readonly character: ThemeCharacter;
  readonly cheers: ThemeCheers;
  readonly terms: ThemeTerms;
  readonly quiz: ThemeQuiz;
};

export type ThemeCssVarName = `--theme-${keyof ThemeColors}`;

export type ThemeCssVars = CSSProperties & Record<ThemeCssVarName, HexColor>;
