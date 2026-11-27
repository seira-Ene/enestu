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
  // 狭い画面では、タイマーを上の方に出すため低くする。
  // あごが切れないよう、上を多く切る。PC版では全体を見せる。
  hero: {
    source: "scene",
    width: 896,
    height: 560,
    frame: "aspect-[2/1] lg:aspect-[16/10]",
    crop: "object-[50%_70%]",
  },
  banner: {
    source: "banner",
    width: 720,
    height: 270,
    frame: "aspect-[8/3]",
    crop: "",
  },
  // 縦長の表情の絵は、顔から上半身までを切り取る。
  happy: {
    source: "happy",
    width: 640,
    height: 700,
    frame: "aspect-[4/3]",
    crop: "object-[50%_20%]",
  },
  sad: {
    source: "sad",
    width: 640,
    height: 700,
    frame: "aspect-[4/3]",
    crop: "object-[50%_20%]",
  },
} as const;

type Props = {
  theme: WorldTheme;
  /** scene は一枚絵、hero はホーム用に低くした一枚絵、banner は横長、happy と sad は表情。 */
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
