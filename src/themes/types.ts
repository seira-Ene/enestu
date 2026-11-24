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
};

export type WorldTheme = {
  readonly id: WorldId;
  readonly displayName: string;
  readonly colors: ThemeColors;
  readonly character: ThemeCharacter;
  readonly cheers: ThemeCheers;
  readonly terms: ThemeTerms;
};

export type ThemeCssVarName = `--theme-${keyof ThemeColors}`;

export type ThemeCssVars = CSSProperties & Record<ThemeCssVarName, HexColor>;
