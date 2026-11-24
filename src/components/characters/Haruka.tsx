import type { CharacterMood } from "@/themes/types";
import { PortraitBase } from "./PortraitBase";

/** ライブ：ヘッドホンとジャケットの、バンド仲間。 */
export function Haruka({ mood }: { mood: CharacterMood }) {
  return (
    <PortraitBase
      mood={mood}
      backdrop="#3a1c63"
      skin="#fbdcc8"
      iris="#19b6d6"
      line="#2a1440"
      behind={
        <>
          <path
            d="M60 16C28 16 22 48 22 98l14-6 8 8 6-10h20l6 10 8-8 14 6c0-50-6-82-38-82z"
            fill="#8a2fd0"
          />
          <path d="M84 40c10 14 12 36 10 56l-10-5c4-18 4-36 0-51z" fill="#4de3ff" />
        </>
      }
      clothes={
        <>
          <path d="M14 120c2-22 20-29 36-32h20c16 3 34 10 36 32z" fill="#1c1530" />
          <path d="M48 88h24l-4 32H52z" fill="#f4f0ff" />
          <path d="M48 88l-8 4 10 28h4zM72 88l8 4-10 28h-4z" fill="#dc86ff" />
          <path d="M56 104l8-6-3 7h5l-9 9 3-8z" fill="#ff4fa3" />
        </>
      }
      front={
        <>
          <path
            d="M32 64c-4-32 12-44 30-42 18 0 30 14 25 40-3-5-5-10-5-16-6 4-14 4-20-2 1 4 0 7-2 10-4-3-7-7-8-12-4 6-9 9-13 10 0 5-2 9-7 12z"
            fill="#b44dff"
          />
          <path d="M62 22c-4 8-3 16 0 22 2-8 6-14 12-18-4-3-8-4-12-4z" fill="#ff6fc0" />
          <path
            d="M30 58C28 22 46 12 60 12s32 10 30 46"
            fill="none"
            stroke="#231a3d"
            strokeWidth="5"
          />
          <rect x="24" y="54" width="12" height="20" rx="6" fill="#231a3d" />
          <rect x="84" y="54" width="12" height="20" rx="6" fill="#231a3d" />
          <rect x="26" y="58" width="4" height="12" rx="2" fill="#4de3ff" />
          <rect x="90" y="58" width="4" height="12" rx="2" fill="#4de3ff" />
        </>
      }
    />
  );
}
