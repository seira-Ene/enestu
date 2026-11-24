import type { ThemeCheers } from "@/themes/types";

/** 待機中／計測中／記録完了。 */
export type StudyStatus = "idle" | "running" | "saved";

export type CheerContext = {
  /** セリフの選択に使う数。同じ値なら同じセリフになる。 */
  readonly seed: number;
  /** 今日の合計秒。取得できていなければ null。 */
  readonly totalSeconds: number | null;
};

/** 状態に応じて、キャラクターが話すセリフを返す。 */
export function selectCheers(
  cheers: ThemeCheers,
  status: StudyStatus,
  { seed, totalSeconds }: CheerContext,
): string[] {
  switch (status) {
    case "idle":
      return [pickLine(cheers.welcome, seed)];
    case "running":
      return [pickLine(cheers.timerStart, seed)];
    case "saved": {
      const minutes = Math.floor((totalSeconds ?? 0) / 60);
      const lines = [pickLine(cheers.timerStop, seed)];
      // 1分未満だと「0分も」になるため、合計のセリフは言わない。
      if (minutes >= 1) {
        lines.push(
          pickLine(cheers.dailyTotal, seed).replaceAll(
            "{minutes}",
            String(minutes),
          ),
        );
      }
      return lines;
    }
  }
}

function pickLine(
  lines: readonly [string, ...string[]],
  seed: number,
): string {
  const index = Math.abs(Math.trunc(seed)) % lines.length;
  return lines[index] ?? lines[0];
}
