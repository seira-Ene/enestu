/**
 * 1人（未ログインなら1端末）あたりの件数の上限。
 * 無償枠を使い切られないためのもので、普段の使い方では届かない値にする。
 * DBのトリガー（enforce_row_limit）の引数と合わせること。
 */
export const ROW_LIMITS = {
  quiz_cards: { count: 2000, perDay: false, label: "カード", unit: "枚" },
  explain_terms: { count: 1000, perDay: false, label: "用語", unit: "個" },
  study_logs: { count: 200, perDay: true, label: "学習の記録", unit: "件" },
  answer_logs: { count: 2000, perDay: true, label: "解答", unit: "件" },
  explanation_logs: {
    count: 500,
    perDay: true,
    label: "説明",
    unit: "件",
  },
} as const;

export type LimitedTable = keyof typeof ROW_LIMITS;

/** DBが上限で止めたときの文。 */
export const ROW_LIMIT_MESSAGE = "row_limit";

/** 上限に達したときに、画面に出す文。 */
export function limitMessage(table: LimitedTable): string {
  const { count, perDay, label, unit } = ROW_LIMITS[table];
  return perDay
    ? `${label}は24時間で${count}${unit}までです。時間をおいてから試してください。`
    : `${label}は${count}${unit}までです。使わないものを削除してから試してください。`;
}
