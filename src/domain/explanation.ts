import { normalizeAnswer } from "./answer-judge";

/** 自分の言葉で説明する用語と、説明に入れたい観点。 */
export type ExplainTerm = {
  readonly id: string;
  readonly subject: string;
  readonly term: string;
  /** 1つが1つの観点。「/」で区切ると言い換えになる。 */
  readonly keywords: readonly string[];
};

export type ExplanationLog = {
  readonly id: string;
  readonly termId: string;
  readonly body: string;
  readonly totalCount: number;
  /** 足りなかった観点。 */
  readonly missing: readonly string[];
  readonly explainedAt: string;
};

export type Judgement = {
  readonly matched: readonly string[];
  readonly missing: readonly string[];
};

/** よく説明できている／あと少し／もう一度。 */
export type ExplanationRank = "great" | "good" | "retry";

const GREAT_PERCENT = 80;
const GOOD_PERCENT = 40;
/** 文章のうち、観点の言葉だけでこれ以上を占めたら、羅列とみなす。 */
const LIST_RATE = 0.7;

/** 観点の言い換えを、比べる形にそろえて並べる。 */
export function keywordVariants(keyword: string): string[] {
  return keyword
    .normalize("NFKC")
    .split("/")
    .map(normalizeAnswer)
    .filter((variant) => variant !== "");
}

/** 説明に、どの観点の言葉が含まれているか。意味の正しさまでは見ない。 */
export function judgeExplanation(
  body: string,
  keywords: readonly string[],
): Judgement {
  const text = normalizeAnswer(body);
  const isMatched = (keyword: string) =>
    keywordVariants(keyword).some((variant) => text.includes(variant));
  return {
    matched: keywords.filter(isMatched),
    missing: keywords.filter((keyword) => !isMatched(keyword)),
  };
}

/** 理解度（0〜100）。 */
export function understandingPercent(
  totalCount: number,
  missingCount: number,
): number {
  return totalCount <= 0
    ? 0
    : Math.round(((totalCount - missingCount) / totalCount) * 100);
}

export function rankExplanation(percent: number): ExplanationRank {
  if (percent >= GREAT_PERCENT) return "great";
  return percent >= GOOD_PERCENT ? "good" : "retry";
}

/** 観点の言葉を並べただけで、文になっていないか。 */
export function isKeywordList(
  body: string,
  keywords: readonly string[],
): boolean {
  const { matched } = judgeExplanation(body, keywords);
  const text = withoutMarks(normalizeAnswer(body));
  if (matched.length === 0 || text === "") return false;
  const used = matched.reduce(
    (sum, keyword) =>
      sum +
      Math.max(
        0,
        ...keywordVariants(keyword)
          .map(withoutMarks)
          .filter((variant) => text.includes(variant))
          .map((variant) => variant.length),
      ),
    0,
  );
  return used / text.length >= LIST_RATE;
}

/**
 * 次に説明する用語。まだ説明していないもの、次に古いものを選ぶ。
 * logs は新しい順。exceptId の用語は、ほかになければ選ぶ。
 */
export function suggestTerm(
  terms: readonly ExplainTerm[],
  logs: readonly ExplanationLog[],
  exceptId: string | null = null,
): ExplainTerm | null {
  const candidates = terms.filter((term) => term.id !== exceptId);
  const pool = candidates.length > 0 ? candidates : terms;
  const order = new Map<string, number>();
  logs.forEach((log, index) => {
    if (!order.has(log.termId)) order.set(log.termId, index);
  });
  let best: ExplainTerm | null = null;
  for (const term of pool) {
    if (best === null || age(term) > age(best)) best = term;
  }
  return best;

  /** 大きいほど、長く説明していない。 */
  function age(term: ExplainTerm): number {
    return order.get(term.id) ?? Number.POSITIVE_INFINITY;
  }
}

export type SubjectAverage = {
  readonly subject: string;
  readonly count: number;
  readonly percent: number;
};

/** 科目ごとの理解度の平均。低い順に並べる。 */
export function averageBySubject(
  logs: readonly Pick<ExplanationLog, "termId" | "totalCount" | "missing">[],
  terms: readonly Pick<ExplainTerm, "id" | "subject">[],
): SubjectAverage[] {
  const subjectOf = new Map(terms.map(({ id, subject }) => [id, subject]));
  const sums = new Map<string, { count: number; percent: number }>();
  for (const { termId, totalCount, missing } of logs) {
    const subject = subjectOf.get(termId);
    // 隠した用語の記録は数えない。
    if (subject === undefined) continue;
    const sum = sums.get(subject) ?? { count: 0, percent: 0 };
    sums.set(subject, {
      count: sum.count + 1,
      percent: sum.percent + understandingPercent(totalCount, missing.length),
    });
  }
  return [...sums]
    .map(([subject, { count, percent }]) => ({
      subject,
      count,
      percent: Math.round(percent / count),
    }))
    .sort(
      (a, b) => a.percent - b.percent || a.subject.localeCompare(b.subject, "ja"),
    );
}

function withoutMarks(text: string): string {
  return text.replace(/[\p{P}\p{S}]/gu, "");
}
