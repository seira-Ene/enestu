import { STATS_DAYS } from "@/domain/subject-stats";
import { fetchExplanationStats } from "@/lib/explain-api";
import { useRemote } from "@/lib/use-remote";
import { HEADING, ITEM, PANEL } from "./form-styles";
import { RatioBar } from "./RatioBar";

/** 科目ごとの、言葉で説明できる度合い。 */
export function ExplanationStats() {
  const { data, error, reload } = useRemote(fetchExplanationStats);
  return (
    <section className={PANEL} aria-labelledby="explanation-stats-title">
      <h2 id="explanation-stats-title" className={HEADING}>
        言語化の理解度（直近{STATS_DAYS}日）
      </h2>
      {error !== null && (
        <div role="alert" className="flex flex-col items-start gap-2">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void reload()}
            className="underline"
          >
            もう一度読み込む
          </button>
        </div>
      )}
      {data === null && error === null && <p>読み込んでいます…</p>}
      {data !== null && data.length === 0 && (
        <p className="opacity-80">
          まだ記録がありません。テストの画面の「言語化」で説明すると、ここに出ます。
        </p>
      )}
      {data !== null && data.length > 0 && (
        <ul className="flex flex-col gap-3 lg:grid lg:grid-cols-2 2xl:grid-cols-3">
          {data.map(({ subject, count, percent }) => (
            <li key={subject} className={ITEM}>
              <RatioBar
                label={subject}
                ratio={percent / 100}
                value={`平均${percent}%（${count}回）`}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
