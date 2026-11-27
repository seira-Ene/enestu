import type { ThemeCharacter } from "@/themes/types";
import { fillHeroName } from "./hero-name";

/**
 * 話しかけたときのセリフを選ぶ。直前と同じセリフは続けない。
 * random は 0 以上 1 未満の乱数。
 */
export function selectTalkLine(
  lines: readonly string[],
  previous: string | null,
  random: () => number,
): string | null {
  const rest = lines.filter((line) => line !== previous);
  const candidates = rest.length > 0 ? rest : lines;
  return candidates[Math.floor(random() * candidates.length)] ?? null;
}

/** この間に BURST_TAPS 回押されたら、連打とみなす。間がこれより空いたら数え直す。 */
export const BURST_WINDOW_MS = 2500;
export const BURST_TAPS = 5;

/** 押した時刻（ミリ秒）と、連打の最中か。 */
export type TapState = {
  readonly taps: readonly number[];
  readonly isBurst: boolean;
};

export const NO_TAPS: TapState = { taps: [], isBurst: false };

/** 押されたときに、次の状態を決める。連打は、間が空くまで続く。 */
export function nextTapState(state: TapState, now: number): TapState {
  const last = state.taps.at(-1);
  const isContinuing = last !== undefined && now - last <= BURST_WINDOW_MS;
  // 間が空いていれば、前の時刻はここで消え、数え直しになる。
  const taps = [...state.taps, now]
    .filter((time) => now - time <= BURST_WINDOW_MS)
    .slice(-BURST_TAPS);
  return {
    taps,
    isBurst: taps.length >= BURST_TAPS || (isContinuing && state.isBurst),
  };
}

/** 連打したときのセリフ。名前を決めた人には、名前を呼ぶセリフも混ぜる。 */
export function burstLinesFor(
  { burstTalk, namedBurstTalk }: ThemeCharacter,
  heroName: string | null,
): string[] {
  return [
    ...burstTalk,
    ...(heroName === null ? [] : fillHeroName(namedBurstTalk, heroName)),
  ];
}
