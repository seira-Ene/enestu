import Image from "next/image";
import { useHydrated } from "@/lib/use-hydrated";
import type { WorldTheme } from "@/themes/types";

/** source は使う画像。frame は枠の形、crop は枠からはみ出す分の切り方。 */
const SHAPES = {
  scene: {
    source: "scene",
    width: 896,
    height: 560,
    frame: "aspect-[16/10]",
    crop: "",
  },
  // タイマーを画面の上の方に出すため、低くする。あごが切れないよう、上を多く切る。
  hero: {
    source: "scene",
    width: 896,
    height: 560,
    frame: "aspect-[2/1]",
    crop: "object-[50%_70%]",
  },
  banner: {
    source: "banner",
    width: 720,
    height: 270,
    frame: "aspect-[8/3]",
    crop: "",
  },
} as const;

type Props = {
  theme: WorldTheme;
  /** scene は一枚絵、hero はホーム用に低くした一枚絵、banner は横長。 */
  kind: keyof typeof SHAPES;
};

/** 世界線の一枚絵。画像のない世界線では何も出さない。装飾なので読み上げない。 */
export function CharacterArt({ theme, kind }: Props) {
  const isHydrated = useHydrated();
  const { images } = theme.character;
  if (images === null) return null;
  const { source, width, height, frame, crop } = SHAPES[kind];
  return (
    <span className={`block w-full bg-surface ${frame}`}>
      {isHydrated && (
        <Image
          // 世界線が変わったら、前の絵を残さない。
          key={images[source]}
          src={images[source]}
          alt=""
          width={width}
          height={height}
          // 用意した大きさのまま配る。
          unoptimized
          className={`size-full object-cover ${crop}`}
        />
      )}
    </span>
  );
}
