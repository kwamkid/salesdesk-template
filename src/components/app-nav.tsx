"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MenuItem } from "@/config/roles";
import { MENU_ICON } from "@/lib/icons";

/** The most specific menu item wins, so /leads/new does not also light up /leads. */
export function activeHref(items: MenuItem[], pathname: string) {
  return items
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

/** Bottom bar below 768px (5 buttons at most, one-thumb use). From 768px the Sidebar takes over. */
export function AppNav({ items }: { items: MenuItem[] }) {
  const pathname = usePathname();
  const active = activeHref(items, pathname);

  return (
    <nav
      aria-label="เมนูหลัก"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-header pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex">
        {items.map((item) => {
          const on = item.href === active;
          const Icon = MENU_ICON[item.icon];
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={`flex min-h-15 flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
                  on ? "font-semibold text-sidebar-active-ink" : "font-medium text-sidebar-ink"
                }`}
              >
                {item.primary ? (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-brand-ink shadow-card">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                ) : (
                  <span className={`flex h-7 w-12 items-center justify-center rounded-full ${on ? "bg-sidebar-active" : ""}`}>
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                )}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
