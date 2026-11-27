"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountLink } from "./AccountLink";
import { GACHA_NAV, navItems } from "./nav-items";
import { WorldButton } from "./WorldButton";
import { useWorld } from "./WorldProvider";

/** PC版の左メニュー。狭い画面では、下のナビと見出しが代わりをする。 */
export function SideNav() {
  const { theme } = useWorld();
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col gap-6 overflow-y-auto border-r-2 border-primary bg-surface px-4 py-6 lg:flex">
      <div>
        <p className="font-display text-3xl text-primary">エネスタ</p>
        <p className="mt-1 text-xs text-accent">{theme.tagline}</p>
      </div>
      <nav aria-label="画面の切り替え（左）">
        <ul className="flex flex-col gap-1">
          {[...navItems(theme.terms), GACHA_NAV].map(({ href, label, plain }) => {
            const isCurrent = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isCurrent ? "page" : undefined}
                  className={`flex items-baseline justify-between gap-2 rounded-[var(--decor-button-radius)] px-4 py-3 ${
                    isCurrent
                      ? "bg-primary font-bold text-background"
                      : "hover:bg-background"
                  }`}
                >
                  <span className="font-display text-lg">{label}</span>
                  <span className="text-xs">{plain}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mt-auto flex flex-col gap-4">
        <WorldButton />
        <AccountLink />
      </div>
    </aside>
  );
}
