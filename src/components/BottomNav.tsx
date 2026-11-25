"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorld } from "./WorldProvider";

export function BottomNav() {
  const { terms } = useWorld().theme;
  const pathname = usePathname();
  const items = [
    { href: "/", label: terms.navTimer, plain: "タイマー" },
    { href: "/cards", label: terms.navCards, plain: "カード" },
    { href: "/quiz", label: terms.navQuiz, plain: "テスト" },
    { href: "/stats", label: terms.navStats, plain: "集計" },
    { href: "/notes", label: terms.navNotes, plain: "メモ" },
  ];

  return (
    <nav
      aria-label="画面の切り替え"
      className="sticky bottom-0 z-10 border-t-2 border-primary bg-surface pb-[env(safe-area-inset-bottom)]"
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
                  isCurrent ? "bg-primary font-bold text-background" : ""
                }`}
              >
                <span className="font-display">{label}</span>
                <span className="text-xs">{plain}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
