import Image from "next/image";
import { useHydrated } from "@/lib/use-hydrated";
import type { CharacterMood } from "@/themes/types";

/** 画像の丸い顔。絵は1枚なので、心配な表情は色と汗で表す。 */
export function CharacterFace({
  src,
  mood,
}: {
  src: string;
  mood: CharacterMood;
}) {
  const isHydrated = useHydrated();
  const isWorried = mood === "worried";
  return (
    <span aria-hidden="true" className="relative block size-full">
      {isHydrated && (
        <Image
          key={src}
          src={src}
          alt=""
          width={320}
          height={320}
          unoptimized
          className={`size-full rounded-full object-cover ${
            isWorried ? "brightness-90 saturate-50" : ""
          }`}
        />
      )}
      {isWorried && (
        <svg
          viewBox="0 0 20 28"
          className="absolute top-0 right-0 h-1/4 w-auto"
        >
          <path
            d="M10 1c5 8 8 12 8 17a8 8 0 0 1-16 0c0-5 3-9 8-17z"
            fill="#8fd3ff"
            stroke="#ffffff"
            strokeWidth="2"
          />
        </svg>
      )}
    </span>
  );
}
