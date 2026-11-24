import type { CharacterMood } from "@/themes/types";
import { PortraitBase } from "./PortraitBase";

/** カフェ：三角巾とエプロンの、のんびりした店員。 */
export function Moka({ mood }: { mood: CharacterMood }) {
  return (
    <PortraitBase
      mood={mood}
      backdrop="#e6cba2"
      skin="#f9dcc4"
      iris="#6f7f2f"
      line="#4a2f1d"
      behind={
        <path
          d="M60 20c-28 0-36 20-36 40-8 6-8 20 0 26 2 10 14 14 20 8h32c6 6 18 2 20-8 8-6 8-20 0-26 0-20-8-40-36-40z"
          fill="#8a5330"
        />
      }
      clothes={
        <>
          <path d="M14 120c2-22 20-29 36-32h20c16 3 34 10 36 32z" fill="#fff4e0" />
          <path d="M42 96h36l4 24H38z" fill="#5d7336" />
          <path d="M44 96l4-9M76 96l-4-9" stroke="#5d7336" strokeWidth="4" />
          <path d="M52 106h16v8q-8 5-16 0z" fill="#728c45" />
        </>
      }
      front={
        <>
          <path
            d="M34 62c-6-28 14-36 26-36s32 8 26 36c-4-3-6-8-7-14-4 3-9 4-13 2 0-3-1-5-3-7-5 7-13 9-20 7-1 5-4 10-9 12z"
            fill="#a56a41"
          />
          <path
            d="M28 42c4-22 20-30 32-30s28 8 32 30c-10-8-22-11-32-11s-22 3-32 11z"
            fill="#c9563f"
          />
          <g fill="#fff4e0">
            <circle cx="46" cy="26" r="2.2" />
            <circle cx="60" cy="20" r="2.2" />
            <circle cx="74" cy="26" r="2.2" />
            <circle cx="84" cy="35" r="2" />
            <circle cx="36" cy="35" r="2" />
          </g>
          <path d="M86 100h20v6c0 8-20 8-20 0z" fill="#ffffff" stroke="#b08a5d" strokeWidth="1.6" />
          <path d="M106 102q7 1 1 8" fill="none" stroke="#b08a5d" strokeWidth="2" />
          <path
            d="M92 95q-3-4 0-8M99 95q-3-4 0-8"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      }
    />
  );
}
