import type { CharacterMood } from "@/themes/types";
import { PortraitBase } from "./PortraitBase";

/** 探偵：ベレー帽とリボンの、几帳面な助手。 */
export function Michiru({ mood }: { mood: CharacterMood }) {
  return (
    <PortraitBase
      mood={mood}
      backdrop="#cdb98c"
      skin="#f8dcc3"
      iris="#2f6b50"
      line="#33231a"
      behind={
        <path
          d="M60 20C30 20 24 46 27 84c8 6 18 4 22 0h22c4 4 14 6 22 0 3-38-3-64-33-64z"
          fill="#33302e"
        />
      }
      clothes={
        <>
          <path d="M14 120c2-22 20-29 36-32h20c16 3 34 10 36 32z" fill="#7d5a34" />
          <path d="M50 87l10 12 10-12 8 5-18 22-18-22z" fill="#faf3e2" />
          <path d="M60 100l-12-6v13zM60 100l12-6v13z" fill="#9b2f2f" />
          <circle cx="60" cy="100.5" r="3.6" fill="#7d2222" />
        </>
      }
      front={
        <>
          <path
            d="M33 62c-4-30 14-38 27-38s31 8 27 38c-2 4-4 4-5 2 0-9-2-15-4-20H42c-2 5-4 11-4 20-1 2-3 2-5-2z"
            fill="#45403c"
          />
          <path d="M40 46c8 4 32 4 40 0l-2-8H42z" fill="#45403c" />
          <path
            d="M28 34c2-18 20-26 36-25 18 0 34 10 32 24-12 6-52 8-68 1z"
            fill="#1f4d3a"
          />
          <path d="M28 33c16 8 54 7 68 0l1 5c-16 7-54 8-70 1z" fill="#163a2c" />
          <path d="M66 9q1-5 5-6" stroke="#163a2c" strokeWidth="3" strokeLinecap="round" />
          <g>
            <path d="M103 103l9 11" stroke="#6b4a22" strokeWidth="5" strokeLinecap="round" />
            <circle cx="97" cy="96" r="10" fill="#dff2f5" opacity="0.75" />
            <circle cx="97" cy="96" r="10" fill="none" stroke="#b98a35" strokeWidth="3" />
            <path d="M91 93q3-4 7-4" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          </g>
        </>
      }
    />
  );
}
