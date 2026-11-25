import type { ThemeTerms } from "@/themes/types";

export type NavItem = {
  readonly href: string;
  /** 世界線での呼び方。 */
  readonly label: string;
  /** どの世界線でも同じ呼び方。 */
  readonly plain: string;
};

/** 下のナビと、PC版の左メニューで共通の項目。 */
export function navItems(terms: ThemeTerms): readonly NavItem[] {
  return [
    { href: "/", label: terms.navTimer, plain: "タイマー" },
    { href: "/cards", label: terms.navCards, plain: "カード" },
    { href: "/quiz", label: terms.navQuiz, plain: "テスト" },
    { href: "/stats", label: terms.navStats, plain: "集計" },
    { href: "/notes", label: terms.navNotes, plain: "メモ" },
  ];
}
