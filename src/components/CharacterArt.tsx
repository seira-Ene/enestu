import Image from "next/image";
import { useHydrated } from "@/lib/use-hydrated";
import type { WorldTheme } from "@/themes/types";

const SHAPES = {
  scene: { width: 896, height: 560, className: "aspect-[16/10]" },
  banner: { width: 720, height: 270, className: "aspect-[8/3]" },
} as const;

type Props = {
  theme: WorldTheme;
  /** scene は一枚絵、banner は横長。 */
  kind: keyof typeof SHAPES;
};

/** 世界線の一枚絵。画像のない世界線では何も出さない。装飾なので読み上げない。 */
export function CharacterArt({ theme, kind }: Props) {
  const isHydrated = useHydrated();
  const { images } = theme.character;
  if (images === null) return null;
  const { width, height, className } = SHAPES[kind];
  return (
    <span className={`block w-full bg-surface ${className}`}>
      {isHydrated && (
        <Image
          // 世界線が変わったら、前の絵を残さない。
          key={images[kind]}
          src={images[kind]}
          alt=""
          width={width}
          height={height}
          // 用意した大きさのまま配る。
          unoptimized
          className="size-full object-cover"
        />
      )}
    </span>
  );
}
