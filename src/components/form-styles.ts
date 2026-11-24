/**
 * ボタン・入力欄・枠の共通の見た目。
 * 色と形は、世界線ごとのCSS変数（globals.css の panel など）に従う。
 */

export const PRIMARY_BUTTON =
  "button-primary font-display block w-full px-4 py-4 text-center text-lg disabled:opacity-50";

export const SECONDARY_BUTTON =
  "button-secondary font-display block w-full px-4 py-3 text-center disabled:opacity-50";

export const TEXT_INPUT =
  "w-full rounded-[min(var(--decor-radius),12px)] border border-accent bg-background px-4 py-3 text-base text-text placeholder:text-text/60 read-only:opacity-70";

export const PANEL = "panel flex flex-col gap-4 p-5";

export const HEADING = "heading font-display text-accent";

export const ALERT =
  "rounded-[min(var(--decor-radius),12px)] border-2 border-primary px-4 py-3";

/** パネルの中の、1件ずつの枠。 */
export const ITEM =
  "rounded-[min(var(--decor-radius),12px)] bg-background px-4 py-3";
