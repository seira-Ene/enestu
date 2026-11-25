"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./nav-items";
import { useWorld } from "./WorldProvider";

/** 狭い画面の下のナビ。PC版では、左メニューが代わりをする。 */
export function BottomNav() {
  const { terms } = useWorld().theme;
  const pathname = usePathname();

  return (
    <nav
      aria-label="画面の切り替え"
      className="sticky bottom-0 z-10 border-t-2 border-primary bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto flex max-w-md">
        {navItems(terms).map(({ href, label, plain }) => {
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
