/**
 * 表記ゆれを吸収した形にそろえる。
 * 全角・半角（NFKC）、大文字・小文字、空白の有無の違いをなくす。
 */
export function normalizeAnswer(text: string): string {
  return text.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
}

/** 入力した解答が、カードの答えと一致するか。空の解答は不正解。 */
export function judgeAnswer(userAnswer: string, correctAnswer: string): boolean {
  const normalized = normalizeAnswer(userAnswer);
  return normalized !== "" && normalized === normalizeAnswer(correctAnswer);
}
