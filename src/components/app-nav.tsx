"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sheet } from "@/components/ui/confirm-card";
import type { MenuItem } from "@/config/roles";
import { MENU_ICON, MoreMenuIcon } from "@/lib/icons";

/** The most specific menu item wins, so /leads/new does not also light up /leads. */
export function activeHref(items: MenuItem[], pathname: string) {
  const hit = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const direct = items.filter((i) => hit(i.href)).sort((a, b) => b.href.length - a.href.length)[0];
  return direct?.href ?? items.find((i) => i.also?.some(hit))?.href;
}

/** Bottom bar below 768px (5 buttons at most, one-thumb use). From 768px the Sidebar takes over.
 *  A role with more than 5 pages gets its `bar` items plus a "เมนู" button that opens all of them. */
export function AppNav({ items }: { items: MenuItem[] }) {
  const pathname = usePathname();
  const active = activeHref(items, pathname);
  const [more, setMore] = useState(false);
  const overflow = items.length > 5;
  const shown = overflow ? items.filter((i) => i.bar).slice(0, 4) : items;
  const moreOn = overflow && !!active && !shown.some((i) => i.href === active);

  return (
    <nav
      aria-label="เมนูหลัก"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-header pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex">
        {shown.map((item) => {
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
        {overflow && (
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMore(true)}
              aria-expanded={more}
              className={`flex min-h-15 w-full flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
                moreOn ? "font-semibold text-sidebar-active-ink" : "font-medium text-sidebar-ink"
              }`}
            >
              <span className={`flex h-7 w-12 items-center justify-center rounded-full ${moreOn ? "bg-sidebar-active" : ""}`}>
                <MoreMenuIcon className="h-5 w-5" aria-hidden />
              </span>
              เมนู
            </button>
          </li>
        )}
      </ul>

      {overflow && (
        <Sheet open={more} onClose={() => setMore(false)} title="เมนูทั้งหมด">
          <ul className="flex flex-col gap-0.5">
            {items.map((item, i) => {
              const on = item.href === active;
              const Icon = MENU_ICON[item.icon];
              const newGroup = item.group && item.group !== items[i - 1]?.group;
              return (
                <li key={item.href}>
                  {newGroup && <h3 className={`px-3 pb-1.5 text-xs font-semibold text-ink-soft ${i === 0 ? "" : "pt-4"}`}>{item.group}</h3>}
                  <Link
                    href={item.href}
                    onClick={() => setMore(false)}
                    aria-current={on ? "page" : undefined}
                    className={`flex min-h-12 items-center gap-3 rounded-control px-3 text-base transition-colors ${
                      on ? "bg-sidebar-active font-semibold text-sidebar-active-ink" : "text-ink hover:bg-sidebar-hover"
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Sheet>
      )}
    </nav>
  );
}
