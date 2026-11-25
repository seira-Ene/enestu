import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** タブレットほどの幅から、横に広げるか。 */
  isWideFromMedium?: boolean;
};

/** 全画面共通の枠。狭い画面では中央の1列、PC版では画面いっぱいに使う。 */
export function ScreenLayout({ children, isWideFromMedium = false }: Props) {
  return (
    <main
      className={`mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-6 lg:max-w-[1800px] lg:px-8 ${
        isWideFromMedium ? "md:max-lg:max-w-4xl" : ""
      }`}
    >
      {children}
    </main>
  );
}
