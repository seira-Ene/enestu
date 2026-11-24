import type { ReactNode } from "react";
import type { CharacterMood } from "@/themes/types";

type Props = {
  mood: CharacterMood;
  /** 背景の丸。 */
  backdrop: string;
  skin: string;
  iris: string;
  /** まゆ・まつげ・口の線。 */
  line: string;
  /** 顔の後ろに描くもの（後ろ髪など）。 */
  behind: ReactNode;
  /** 首から下。 */
  clothes: ReactNode;
  /** 顔の上に描くもの（前髪など）。 */
  front: ReactNode;
};

/** 全キャラクター共通の顔。髪・服・小物だけを各キャラクターが描く。 */
export function PortraitBase({
  mood,
  backdrop,
  skin,
  iris,
  line,
  behind,
  clothes,
  front,
}: Props) {
  return (
    <svg viewBox="0 0 120 120" className="size-full rounded-full" aria-hidden="true">
      <circle cx="60" cy="60" r="60" fill={backdrop} />
      {behind}
      <path d="M52 82h16v16q-8 7-16 0z" fill={skin} />
      <path d="M52 86q8 8 16 0v4q-8 8-16 0z" fill={line} opacity="0.18" />
      {clothes}
      <ellipse cx="35" cy="62" rx="4" ry="6" fill={skin} />
      <ellipse cx="85" cy="62" rx="4" ry="6" fill={skin} />
      <path
        d="M36 52c0-25 48-25 48 0 0 22-11 37-24 37S36 74 36 52z"
        fill={skin}
      />
      <ellipse cx="43" cy="72" rx="5" ry="3" fill="#ff8f8f" opacity="0.4" />
      <ellipse cx="77" cy="72" rx="5" ry="3" fill="#ff8f8f" opacity="0.4" />
      <Eyes mood={mood} iris={iris} line={line} />
      <path
        d="M59 71q1 2 3 1"
        fill="none"
        stroke={line}
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <Mouth mood={mood} line={line} />
      {front}
    </svg>
  );
}

function Eyes({
  mood,
  iris,
  line,
}: {
  mood: CharacterMood;
  iris: string;
  line: string;
}) {
  const stroke = {
    fill: "none",
    stroke: line,
    strokeLinecap: "round" as const,
  };
  const brows =
    mood === "worried" ? "M42 51l11-4M78 51l-11-4" : "M42 48q6-3 11 0M67 48q6-3 11 0";
  return (
    <>
      <path d={brows} {...stroke} strokeWidth="1.8" />
      {mood === "happy" ? (
        <path
          d="M42 63q6-9 12 0M66 63q6-9 12 0"
          {...stroke}
          strokeWidth="2.6"
        />
      ) : (
        [48, 72].map((x) => (
          <g key={x}>
            <ellipse cx={x} cy="61" rx="5.4" ry="7" fill="#ffffff" />
            <ellipse cx={x} cy="61.5" rx="4.6" ry="6.4" fill={iris} />
            <ellipse cx={x} cy="62.5" rx="2.4" ry="3.6" fill={line} />
            <circle cx={x - 1.6} cy="58.6" r="1.7" fill="#ffffff" />
            <circle cx={x + 1.8} cy="64.6" r="0.9" fill="#ffffff" />
            <path
              d={`M${x - 6.4} 57.5q6.4-6.5 12.8 0`}
              {...stroke}
              strokeWidth="2.4"
            />
          </g>
        ))
      )}
    </>
  );
}

function Mouth({ mood, line }: { mood: CharacterMood; line: string }) {
  if (mood === "happy") {
    return (
      <>
        <path d="M53 76q7 12 14 0z" fill="#b5404f" />
        <path d="M56 80.5q4 3.5 8 0-4-2.2-8 0z" fill="#ff9aa5" />
      </>
    );
  }
  return (
    <path
      d={mood === "worried" ? "M55 80q5-4 10 0" : "M55 77q5 4.5 10 0"}
      fill="none"
      stroke={line}
      strokeWidth="2"
      strokeLinecap="round"
    />
  );
}
