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
