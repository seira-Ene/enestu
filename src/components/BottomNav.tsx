"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ThemeTerms } from "@/themes/types";

export function BottomNav({ terms }: { terms: ThemeTerms }) {
  const pathname = usePathname();
  const items = [
    { href: "/", label: terms.navTimer, plain: "タイマー" },
    { href: "/cards", label: terms.navCards, plain: "カード" },
    { href: "/quiz", label: terms.navQuiz, plain: "テスト" },
    { href: "/stats", label: terms.navStats, plain: "集計" },
  ];

  return (
    <nav
      aria-label="画面の切り替え"
      className="sticky bottom-0 border-t border-accent bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-md">
        {items.map(({ href, label, plain }) => {
          const isCurrent = pathname === href;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={isCurrent ? "page" : undefined}
                className={`flex flex-col items-center py-2 ${
                  isCurrent ? "font-bold text-primary" : "opacity-80"
                }`}
              >
                <span>{label}</span>
                <span className="text-xs">{plain}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
