import { useState } from "react";
import { AI_DAILY_LIMIT } from "@/domain/ai-key";
import type { AiQuest } from "@/domain/ai-quest";
import { jstDateKey } from "@/domain/study-time";
import { QUEST_ANSWERS, QUEST_STUDY_SECONDS } from "@/domain/weakness";
import { askAiQuest } from "@/lib/ai-api";
import { saveQuest } from "@/lib/daily-quest";
import { useAccount } from "./AccountProvider";
import { ALERT, ITEM, PRIMARY_BUTTON, SECONDARY_BUTTON } from "./form-styles";

/**
 * AIに今日のクエストを相談する。ログインした人だけに出す。
 * 採用するかは本人が決め、目標の量と達成の判定は今の決まりのまま。
 */
export function AiQuestAdvisor({ onAdopted }: { onAdopted: () => Promise<void> }) {
  const { data: account } = useAccount();
  const [proposal, setProposal] = useState<AiQuest | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (account?.kind !== "signed_in") return null;

  async function handleAsk() {
    setIsAsking(true);
    setError(null);
    setNotice(null);
    const result = await askAiQuest();
    setIsAsking(false);
    if (result.ok) setProposal(result.value);
    else setError(result.error);
  }

  async function handleAdopt(quest: AiQuest) {
    saveQuest({
      date: jstDateKey(new Date()),
      kind: quest.kind,
      subject: quest.subject,
      ai: { title: quest.title, steps: quest.steps, reason: quest.reason },
    });
    setProposal(null);
    setNotice("今日のクエストを、AIの提案にしました。");
    await onAdopted();
  }

  return (
    <div className="flex flex-col gap-2">
      {proposal === null ? (
        <button
          type="button"
          onClick={() => void handleAsk()}
          disabled={isAsking}
          className={SECONDARY_BUTTON}
        >
          {isAsking ? "AIが考えています…" : "AIに今日のクエストを相談する"}
        </button>
      ) : (
        <div role="group" aria-label="AIの提案" className={`${ITEM} flex flex-col gap-2`}>
          <p className="text-xs text-accent">AIの提案（Gemini）</p>
          <p className="font-display break-words">{proposal.title}</p>
          <p className="text-sm">
            {proposal.subject}：
            {proposal.kind === "weak"
              ? `問題を${QUEST_ANSWERS}問解く`
              : `${QUEST_STUDY_SECONDS / 60}分学ぶ`}
          </p>
          <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
            {proposal.steps.map((step) => (
              <li key={step} className="break-words">
                {step}
              </li>
            ))}
          </ol>
          <p className="break-words text-sm opacity-80">{proposal.reason}</p>
          <button
            type="button"
            onClick={() => void handleAdopt(proposal)}
            className={PRIMARY_BUTTON}
          >
            このクエストにする
          </button>
          <button
            type="button"
            onClick={() => setProposal(null)}
            className="self-end text-sm underline"
          >
            やめる
          </button>
        </div>
      )}
      {error !== null && (
        <p role="alert" className={`${ALERT} text-sm`}>
          {error}
        </p>
      )}
      <p role="status" className="text-sm text-accent empty:hidden">
        {notice}
      </p>
      <p className="text-xs opacity-80">
        科目名と数字（学習時間・正答率など）だけを Gemini に送ります。カードの中身やメモは送りません。1日
        {AI_DAILY_LIMIT}回の中で、1回と数えます。
      </p>
    </div>
  );
}
