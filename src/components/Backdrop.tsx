import type { ComponentType } from "react";
import type { WorldId } from "@/themes/types";

/** 画面全体の背景。世界線の雰囲気を出すだけで、操作には関わらない。 */
export function Backdrop({ worldId }: { worldId: WorldId }) {
  const Scene = SCENES[worldId];
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background"
    >
      <Scene />
    </div>
  );
}

const SCENES: Readonly<Record<WorldId, ComponentType>> = {
  dungeon: Dungeon,
  otome: Otome,
  detective: Detective,
  live: Live,
  cafe: Cafe,
};

function Dungeon() {
  return (
    <>
      <svg className="absolute inset-0 size-full">
        <defs>
          <pattern id="bricks" width="72" height="48" patternUnits="userSpaceOnUse">
            <rect width="72" height="48" fill="#0f0d19" />
            <rect x="1.5" y="1.5" width="69" height="21" fill="#1b1829" />
            <rect x="-34.5" y="25.5" width="69" height="21" fill="#191626" />
            <rect x="37.5" y="25.5" width="69" height="21" fill="#1e1a2e" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#bricks)" />
      </svg>
      <div className="scene-torch absolute -top-10 left-0 size-64 -translate-x-1/3 rounded-full bg-[radial-gradient(circle,#f2b84b66,transparent_65%)]" />
      <div className="scene-torch absolute right-0 bottom-24 size-72 translate-x-1/3 rounded-full bg-[radial-gradient(circle,#ff8a3c55,transparent_65%)] [animation-delay:-1.3s]" />
    </>
  );
}

const PETALS = [
  { left: "6%", delay: "0s", size: 16 },
  { left: "22%", delay: "-6s", size: 12 },
  { left: "41%", delay: "-2s", size: 18 },
  { left: "58%", delay: "-9s", size: 13 },
  { left: "74%", delay: "-4s", size: 17 },
  { left: "90%", delay: "-11s", size: 14 },
];

function Otome() {
  return (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(160deg,#ffe3ec,#fdeef6_45%,#f4e0f5)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,#ffffffcc,transparent_45%)]" />
      {PETALS.map(({ left, delay, size }) => (
        <svg
          key={left}
          viewBox="0 0 20 20"
          width={size}
          height={size}
          className="scene-petal absolute -top-6"
          style={{ left, animationDelay: delay }}
        >
          <path d="M10 1c6 4 8 10 4 17-1-2-3-2-4 0-1-2-3-2-4 0C2 11 4 5 10 1z" fill="#f3a6bd" />
        </svg>
      ))}
    </>
  );
}

function Detective() {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,#f3e8cc,#e6d6b2_55%,#d9c69b)]" />
      <svg className="absolute inset-0 size-full opacity-50">
        <defs>
          <pattern id="ruled" width="40" height="32" patternUnits="userSpaceOnUse">
            <path d="M0 31.5h40" stroke="#b79a66" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ruled)" />
        <path d="M44 0v2000" stroke="#a8432f" strokeWidth="1" opacity="0.5" />
      </svg>
      <div className="absolute -right-16 bottom-32 size-48 rounded-full border-[10px] border-[#8a5a2b]/15" />
      <div className="absolute top-40 -left-14 size-40 rounded-full border-[8px] border-[#8a5a2b]/15" />
    </>
  );
}

function Live() {
  return (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#150a2b,#0b0814_60%,#160a24)]" />
      <div className="scene-beam absolute -top-24 left-[8%] h-[120%] w-28 origin-top bg-[linear-gradient(180deg,#dc86ff88,transparent_75%)] [clip-path:polygon(45%_0,55%_0,100%_100%,0_100%)]" />
      <div className="scene-beam absolute -top-24 right-[8%] h-[120%] w-28 origin-top bg-[linear-gradient(180deg,#4de3ff77,transparent_75%)] [animation-delay:-2s] [clip-path:polygon(45%_0,55%_0,100%_100%,0_100%)]" />
      <div className="scene-beam absolute -top-24 left-1/2 h-[120%] w-32 -translate-x-1/2 origin-top bg-[linear-gradient(180deg,#ff4fa366,transparent_75%)] [animation-delay:-4s] [clip-path:polygon(45%_0,55%_0,100%_100%,0_100%)]" />
      <svg
        viewBox="0 0 400 80"
        preserveAspectRatio="none"
        className="absolute bottom-0 h-28 w-full"
      >
        <path
          d="M0 80V52q12-16 24 0 8-22 22-2 10-14 22 2 12-24 26 0 10-12 20 0 14-22 28 0 8-14 20 0 14-26 28 0 10-12 22 0 12-20 26 0 10-14 20 0 14-24 28 0 10-14 22 0 12-20 26 0 10-12 20 0 14-20 26 2 8-10 20 0v28z"
          fill="#06030d"
        />
      </svg>
    </>
  );
}

function Cafe() {
  return (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#f8eedb,#f0dfc3)]" />
      <svg className="absolute inset-0 size-full opacity-60">
        <defs>
          <pattern id="planks" width="240" height="56" patternUnits="userSpaceOnUse">
            <path d="M0 55.5h240" stroke="#c9a678" strokeWidth="1.4" />
            <path d="M20 18q60-8 120 2t100-4M0 38q80 8 150-2t90 4" fill="none" stroke="#d8bb90" strokeWidth="1" />
            <path d="M160 0v56" stroke="#c9a678" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#planks)" />
      </svg>
      <div className="absolute -top-20 -right-20 size-72 rounded-full bg-[radial-gradient(circle,#fff6d8,transparent_65%)]" />
      {["12%", "48%", "82%"].map((left, index) => (
        <div
          key={left}
          className="scene-steam absolute bottom-0 h-40 w-10 rounded-full bg-white/60 blur-xl"
          style={{ left, animationDelay: `${index * -2.5}s` }}
        />
      ))}
    </>
  );
}
