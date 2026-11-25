import { useRef, useState } from "react";
import { selectTalkLine } from "@/domain/talk";
import type { CharacterMood, WorldTheme } from "@/themes/types";
import { CharacterArt } from "./CharacterArt";
import { CharacterPanel } from "./CharacterPanel";
import { SpeechBubble } from "./SpeechBubble";

type Props = {
  theme: WorldTheme;
  mood: CharacterMood;
  lines: readonly string[];
  /** 話しかけたときのセリフ。 */
  talkLines: readonly string[];
};

/** 話しかけられたときの、小さな身ぶり。 */
const NOD: Keyframe[] = [
  { transform: "translateY(0)" },
  { transform: "translateY(-6px)" },
  { transform: "translateY(0)" },
];
const NOD_MS = 260;

/** ホームの大きな一枚絵とセリフ。絵か吹き出しを押すと話す。 */
export function CharacterHero({ theme, mood, lines, talkLines }: Props) {
  const { name, images } = theme.character;
  const artRef = useRef<HTMLDivElement>(null);
  /** 話しかけて出したセリフ。元のセリフが変わったら無効になる。 */
  const [talk, setTalk] = useState<{ base: string; line: string } | null>(null);
  const base = `${theme.id}\n${lines.join("\n")}`;
  const line = talk !== null && talk.base === base ? talk.line : null;
  const shown = line === null ? lines : [line];

  if (images === null) {
    return <CharacterPanel theme={theme} mood={mood} lines={lines} />;
  }

  function handleTalk() {
    const next = selectTalkLine(talkLines, line, Math.random);
    if (next === null) return;
    setTalk({ base, line: next });
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      artRef.current?.animate(NOD, NOD_MS);
    }
  }

  return (
    <section aria-label={`${name}の応援`} className="flex flex-col">
      <div
        // 表情が変わったら、動きをやり直す。
        key={mood}
        ref={artRef}
        // キー操作と読み上げは、吹き出しのボタンが受け持つ。
        onClick={handleTalk}
        className={`panel cursor-pointer overflow-hidden ${
          mood === "happy" ? "motion-safe:animate-hop" : ""
        }`}
      >
        <CharacterArt theme={theme} kind="hero" />
      </div>
      <SpeechBubble
        name={name}
        lines={shown}
        className="mx-3 -mt-5"
        onTalk={handleTalk}
      />
    </section>
  );
}
