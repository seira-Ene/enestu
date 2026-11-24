/** ボタンと入力欄の共通の見た目。色はテーマのCSS変数に従う。 */

export const PRIMARY_BUTTON =
  "w-full rounded-xl bg-primary px-4 py-4 text-lg font-bold text-background transition-opacity hover:opacity-90 disabled:opacity-50";

export const SECONDARY_BUTTON =
  "w-full rounded-xl border border-accent px-4 py-3 font-bold text-text transition-opacity hover:opacity-90 disabled:opacity-50";

export const TEXT_INPUT =
  "w-full rounded-xl border border-accent bg-background px-4 py-3 text-base text-text placeholder:opacity-60 read-only:opacity-70";

export const PANEL = "flex flex-col gap-4 rounded-2xl bg-surface p-4";

export const ALERT = "rounded-xl border border-primary px-4 py-3";
