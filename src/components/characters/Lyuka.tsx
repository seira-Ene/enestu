import type { CharacterMood } from "@/themes/types";
import { PortraitBase } from "./PortraitBase";

/** ダンジョン：フードをかぶり、ランタンを持つ見習いの灯守り。 */
export function Lyuka({ mood }: { mood: CharacterMood }) {
  return (
    <PortraitBase
      mood={mood}
      backdrop="#2c2748"
      skin="#f6d9c2"
      iris="#4aa7a0"
      line="#33284f"
      behind={
        <path
          d="M60 10C24 10 20 50 24 96h72C100 50 96 10 60 10z"
          fill="#3f5a8c"
        />
      }
      clothes={
        <>
          <path d="M14 120c2-22 22-30 36-32l10 10 10-10c14 2 34 10 36 32z" fill="#4b6aa3" />
          <path d="M50 88l10 10 10-10 4 4-14 14-14-14z" fill="#f2b84b" />
        </>
      }
      front={
        <>
          <path
            d="M35 56c-2-28 20-34 28-32 14 0 24 12 22 32-4-6-7-12-8-18-4 8-12 11-20 11 2-3 4-6 4-9-6 8-14 12-21 12-1 2-3 3-5 4z"
            fill="#c9d6f2"
          />
          <path
            d="M60 10C26 10 22 44 27 70c3-28 14-44 33-44s30 16 33 44c5-26 1-60-33-60z"
            fill="#5878b5"
          />
          <circle cx="98" cy="98" r="18" fill="#ffd97a" opacity="0.28" />
          <path d="M92 88q6-8 12 0" fill="none" stroke="#b98a35" strokeWidth="2.4" />
          <rect x="90" y="88" width="16" height="4" rx="1" fill="#b98a35" />
          <rect x="91" y="92" width="14" height="16" rx="3" fill="#ffe7a3" />
          <path d="M98 95c4 5 3 9 0 10-3-1-4-5 0-10z" fill="#ff9a3c" />
          <rect x="90" y="107" width="16" height="4" rx="1" fill="#b98a35" />
        </>
      }
    />
  );
}
