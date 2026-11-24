import type { ComponentType } from "react";
import type { WorldId } from "@/themes/types";

/** テストの演出の絵。percent は進み具合（0〜100）で、100 なら達成。 */
export function StageArt({
  worldId,
  percent,
}: {
  worldId: WorldId;
  percent: number;
}) {
  const Art = ARTS[worldId];
  return (
    <svg viewBox="0 0 120 100" className="h-28" aria-hidden="true">
      <Art percent={percent} />
    </svg>
  );
}

type ArtProps = { percent: number };

const ARTS: Readonly<Record<WorldId, ComponentType<ArtProps>>> = {
  dungeon: Guardian,
  otome: Heart,
  detective: CaseBoard,
  live: Stage,
  cafe: Cup,
};

/** 石の番人。追い詰められるほど目の光が変わり、最後は崩れる。 */
function Guardian({ percent }: ArtProps) {
  if (percent >= 100) {
    return (
      <>
        <path d="M18 92l12-16 14 8 10-14 16 12 12-8 20 18z" fill="#6f6a86" />
        <path d="M60 18l7 14 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2z" fill="#ffd45e" />
      </>
    );
  }
  return (
    <>
      <path d="M34 92V50l10-10h32l10 10v42z" fill="#6f6a86" />
      <path d="M44 40V22l8-8h16l8 8v18z" fill="#87819f" />
      <path d="M34 54l-14 8v22l10 4zM86 54l14 8v22l-10 4z" fill="#5c5774" />
      <rect x="48" y="24" width="8" height="5" fill={percent >= 60 ? "#ffd45e" : "#ff5c5c"} />
      <rect x="64" y="24" width="8" height="5" fill={percent >= 60 ? "#ffd45e" : "#ff5c5c"} />
      <path d="M50 35h20" stroke="#3b3750" strokeWidth="2.5" />
      <circle cx="60" cy="62" r="7" fill="#6fd3c7" opacity="0.9" />
      {percent >= 30 && (
        <path d="M44 48l6 8-4 8 8 10" fill="none" stroke="#2b2740" strokeWidth="2.2" />
      )}
      {percent >= 60 && (
        <path d="M78 46l-6 10 6 8-8 12" fill="none" stroke="#2b2740" strokeWidth="2.2" />
      )}
    </>
  );
}

/** 下から満ちていくハート。 */
function Heart({ percent }: ArtProps) {
  const shape =
    "M60 88C20 60 22 22 44 20c9 0 14 6 16 12 2-6 7-12 16-12 22 2 24 40-16 68z";
  const top = 90 - (percent / 100) * 72;
  return (
    <>
      <clipPath id="heart-clip">
        <path d={shape} />
      </clipPath>
      <path d={shape} fill="#fbd9e3" />
      <rect
        x="0"
        y={top}
        width="120"
        height="100"
        fill="#e2476f"
        clipPath="url(#heart-clip)"
      />
      <path d={shape} fill="none" stroke="#9b2247" strokeWidth="2.5" />
      <path d="M38 34q4-8 12-8" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
      {percent >= 100 && (
        <g fill="#f3a6bd">
          <path d="M16 24q6-8 8 0 8-2 2 6l-6 6-6-6z" />
          <path d="M98 18q6-8 8 0 8-2 2 6l-6 6-6-6z" />
        </g>
      )}
    </>
  );
}

const CLUES = [
  { x: 16, y: 16, at: 20 },
  { x: 50, y: 10, at: 40 },
  { x: 84, y: 18, at: 60 },
  { x: 30, y: 56, at: 80 },
  { x: 70, y: 56, at: 100 },
];

/** 証拠が増え、赤い糸でつながっていく掲示板。 */
function CaseBoard({ percent }: ArtProps) {
  const found = CLUES.filter((clue) => percent >= clue.at);
  return (
    <>
      <rect x="4" y="4" width="112" height="90" rx="3" fill="#a9763f" />
      <rect x="9" y="9" width="102" height="80" fill="#c99a61" />
      {CLUES.map((clue) => (
        <g key={clue.at} opacity={percent >= clue.at ? 1 : 0.25}>
          <rect x={clue.x} y={clue.y} width="22" height="26" fill="#fbf4e0" />
          <path
            d={`M${clue.x + 4} ${clue.y + 10}h14M${clue.x + 4} ${clue.y + 15}h14M${clue.x + 4} ${clue.y + 20}h9`}
            stroke="#8a6a3c"
            strokeWidth="1.5"
          />
          <circle cx={clue.x + 11} cy={clue.y + 3} r="2.6" fill="#b3261e" />
        </g>
      ))}
      <polyline
        points={found.map((clue) => `${clue.x + 11},${clue.y + 3}`).join(" ")}
        fill="none"
        stroke="#b3261e"
        strokeWidth="1.6"
      />
      {percent >= 100 && (
        <g transform="rotate(-12 60 52)">
          <rect x="28" y="38" width="64" height="26" rx="4" fill="none" stroke="#b3261e" strokeWidth="4" />
          <text x="60" y="57" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#b3261e">
            解決
          </text>
        </g>
      )}
    </>
  );
}

/** 熱気が増すほど、照明と腕が増えるステージ。 */
function Stage({ percent }: ArtProps) {
  const fans = [8, 24, 40, 56, 72, 88, 104];
  const raised = Math.round((percent / 100) * fans.length);
  return (
    <>
      <rect width="120" height="100" rx="8" fill="#1d1038" />
      <path d="M20 0h14l20 70H6z" fill="#dc86ff" opacity={0.15 + percent / 200} />
      <path d="M86 0h14l14 70H66z" fill="#4de3ff" opacity={0.15 + percent / 200} />
      <path d="M53 0h14l18 70H35z" fill="#ff4fa3" opacity={percent / 160} />
      <rect y="66" width="120" height="6" fill="#dc86ff" />
      <path d="M60 30v30M54 66h12" stroke="#f6f0ff" strokeWidth="2.5" />
      <rect x="55" y="22" width="10" height="15" rx="5" fill="#f6f0ff" />
      {fans.map((x, index) => (
        <g key={x} fill="#07040f">
          <circle cx={x + 4} cy="88" r="7" />
          <rect x={x - 3} y="92" width="14" height="10" />
          {index < raised && (
            <path
              d={`M${x + 9} 92l5-16`}
              stroke="#4de3ff"
              strokeWidth="3"
              strokeLinecap="round"
            />
          )}
        </g>
      ))}
      {percent >= 100 && (
        <g fill="#ffe45e">
          <path d="M24 16l3 6 6 1-5 4 2 7-6-4-6 4 2-7-5-4 6-1z" />
          <path d="M96 16l3 6 6 1-5 4 2 7-6-4-6 4 2-7-5-4 6-1z" />
        </g>
      )}
    </>
  );
}

/** 注がれていくカップ。満ちるとラテアートと湯気が出る。 */
function Cup({ percent }: ArtProps) {
  const shape = "M28 34h60v26c0 18-12 28-30 28S28 78 28 60z";
  const top = 88 - (percent / 100) * 50;
  return (
    <>
      <clipPath id="cup-clip">
        <path d={shape} />
      </clipPath>
      <ellipse cx="58" cy="92" rx="44" ry="6" fill="#d9b88a" />
      <path d="M88 42c18-2 18 26-4 26" fill="none" stroke="#c79a63" strokeWidth="6" />
      <path d={shape} fill="#ffffff" />
      <rect x="20" y={top} width="80" height="60" fill="#8a5330" clipPath="url(#cup-clip)" />
      {percent > 0 && (
        <rect x="20" y={top} width="80" height="5" fill="#e9c79a" clipPath="url(#cup-clip)" />
      )}
      <path d={shape} fill="none" stroke="#c79a63" strokeWidth="2.5" />
      {percent >= 100 && (
        <>
          <path d="M58 70c-10-8-8-18-1-17 1 0 1 1 1 2 0-1 0-2 1-2 7-1 9 9-1 17z" fill="#f7e3c4" />
          <g fill="none" stroke="#b98a5d" strokeWidth="3" strokeLinecap="round">
            <path d="M44 24q-5-7 0-14M58 24q-5-7 0-14M72 24q-5-7 0-14" />
          </g>
        </>
      )}
    </>
  );
}
