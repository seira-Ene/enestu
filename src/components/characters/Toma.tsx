import type { CharacterMood } from "@/themes/types";
import { PortraitBase } from "./PortraitBase";

/** 乙女ゲーム：眼鏡とカーディガンの、図書室の先輩。 */
export function Toma({ mood }: { mood: CharacterMood }) {
  return (
    <PortraitBase
      mood={mood}
      backdrop="#f8cfdc"
      skin="#fbe0cf"
      iris="#8a5a3c"
      line="#4a2c2a"
      behind={
        <path
          d="M60 18C32 18 28 44 32 72c3 8 8 10 12 8h32c4 2 9 0 12-8 4-28 0-54-28-54z"
          fill="#7b4d38"
        />
      }
      clothes={
        <>
          <path d="M14 120c2-22 20-29 36-32h20c16 3 34 10 36 32z" fill="#b5566f" />
          <path d="M48 88l12 22 12-22-6-3H54z" fill="#ffffff" />
          <path d="M57 98h6l3 22H54z" fill="#4f6d9c" />
          <path d="M48 88l-6 6 14 26h4zM72 88l6 6-14 26h-4z" fill="#a3455f" />
        </>
      }
      front={
        <>
          <path
            d="M33 60c-5-34 17-42 29-40 16 0 28 14 24 40-3-4-5-9-6-15-2 4-5 6-8 7 0-4-1-8-3-11-4 8-11 13-20 14 2-3 3-6 3-9-6 4-11 8-13 14-2 1-4 1-6 0z"
            fill="#96624a"
          />
          <path
            d="M46 26c8-5 18-5 26 1"
            fill="none"
            stroke="#b98066"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <g fill="none" stroke="#5b3a3a" strokeWidth="1.8">
            <rect x="39.5" y="53" width="17" height="15" rx="6" />
            <rect x="63.5" y="53" width="17" height="15" rx="6" />
            <path d="M56.5 59q3.5-2.4 7 0" />
          </g>
        </>
      }
    />
  );
}
