import {
  isKeywordList,
  judgeExplanation,
  understandingPercent,
  type ExplainTerm,
  type ExplanationLog,
} from "@/domain/explanation";
import { ALERT, PRIMARY_BUTTON, SECONDARY_BUTTON } from "./form-styles";
import { RatioBar } from "./RatioBar";

type Props = {
  term: ExplainTerm;
  log: ExplanationLog;
  onRewrite: () => void;
  onNext: () => void;
};

/** 説明の判定の結果。 */
export function ExplanationResult({ term, log, onRewrite, onNext }: Props) {
  const percent = understandingPercent(log.totalCount, log.missing.length);
  const { matched } = judgeExplanation(log.body, term.keywords);

  return (
    <div className="flex flex-col gap-4">
      <div role="status" className="flex flex-col gap-4">
        <p className="font-display text-center text-4xl tabular-nums">
          {percent}%
        </p>
        <RatioBar
          label="理解度"
          ratio={percent / 100}
          value={`${log.totalCount}個中${log.totalCount - log.missing.length}個の観点`}
        />
        {isKeywordList(log.body, term.keywords) && (
          <p className={ALERT}>
            言葉が並んでいるだけのようです。つながりがわかるように、文で説明してみましょう。
          </p>
        )}
        {log.missing.length > 0 && (
          <KeywordItems
            title="足りなかった観点"
            mark="△"
            keywords={log.missing}
          />
        )}
        {matched.length > 0 && (
          <KeywordItems title="入っていた観点" mark="○" keywords={matched} />
        )}
      </div>
      <div>
        <p className="text-sm text-accent">あなたの説明</p>
        <p className="break-words whitespace-pre-wrap">{log.body}</p>
      </div>
      <p className="text-xs opacity-80">
        言葉が入っているかだけを見ています。「〜ではない」のような逆の意味や、説明の正しさまではわかりません。
      </p>
      <button type="button" onClick={onRewrite} className={PRIMARY_BUTTON}>
        書き直す
      </button>
      <button type="button" onClick={onNext} className={SECONDARY_BUTTON}>
        次の用語へ
      </button>
    </div>
  );
}

function KeywordItems({
  title,
  mark,
  keywords,
}: {
  title: string;
  mark: string;
  keywords: readonly string[];
}) {
  return (
    <div>
      <p className="text-sm text-accent">{title}</p>
      <ul>
        {keywords.map((keyword) => (
          <li key={keyword} className="break-words">
            <span aria-hidden="true">{mark} </span>
            {keyword}
          </li>
        ))}
      </ul>
    </div>
  );
}
