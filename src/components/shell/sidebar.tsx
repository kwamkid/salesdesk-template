"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { activeHref } from "@/components/app-nav";
import { APP } from "@/config/app";
import type { MenuItem } from "@/config/roles";
import { Tooltip } from "@/components/ui/tooltip";
import { CollapseMenuIcon, ExpandMenuIcon, MENU_ICON } from "@/lib/icons";

/** Shared with the pre-paint script in src/app/layout.tsx */
const KEY = "sd-sidebar-collapsed";

/** Collapse state lives on <html data-sidebar="collapsed">, so CSS (globals.css) draws the rail
 *  before paint and nothing here depends on it while rendering — no hydration jump. */
function toggleCollapsed() {
  const root = document.documentElement;
  const next = root.getAttribute("data-sidebar") !== "collapsed";
  if (next) root.setAttribute("data-sidebar", "collapsed");
  else root.removeAttribute("data-sidebar");
  try {
    localStorage.setItem(KEY, next ? "1" : "0");
  } catch {
    /* storage blocked (private mode): the toggle still works for this visit */
  }
}

const iconBtn =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-soft transition-colors hover:bg-sidebar-hover hover:text-sidebar-ink-hover";

/** Left menu from 768px, like aoocommerce's AppSidebar: logo row on top, menu rows, collapse to an icon rail. */
/** `top`: the project picker, shown under the logo row. */
export function Sidebar({
  items,
  homeHref,
  top,
}: {
  items: MenuItem[];
  homeHref: string;
  top?: ReactNode;
}) {
  const pathname = usePathname();
  const active = activeHref(items, pathname);
  const main = items.filter((i) => !i.bottom);
  const pinned = items.filter((i) => i.bottom);

  return (
    <aside
      aria-label="เมนูด้านข้าง"
      className="sidebar-panel sticky top-0 hidden h-dvh w-58 shrink-0 flex-col border-r border-line bg-sidebar transition-[width] duration-200 md:flex"
    >
      {/* Logo row — h-16 so its bottom line meets the top bar's */}
      <div className="nav-logo-row flex h-16 shrink-0 items-center gap-2 border-b border-line px-3">
        <Link
          href={homeHref}
          className="nav-logo flex min-h-11 min-w-0 flex-1 items-center gap-2 pl-1 font-bold text-ink"
        >
          <Image
            src={APP.logo}
            alt={`โลโก้ ${APP.name}`}
            width={32}
            height={32}
            className="h-8 w-8 shrink-0"
            priority
          />
          <span className="nav-logo-name truncate text-lg">{APP.name}</span>
        </Link>
        <Tooltip text="ย่อเมนู" position="bottom">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="ย่อเมนู"
            className={`nav-collapse-top ${iconBtn}`}
          >
            <CollapseMenuIcon className="h-[18px] w-[18px]" aria-hidden />
          </button>
        </Tooltip>
      </div>

      {top && <div className="shrink-0 border-b border-line p-3">{top}</div>}

      <nav aria-label="เมนูหลัก" className="flex-1 overflow-y-auto p-3">
        {/* Rail only: the expand button sits above the menu (the logo row is too narrow for both) */}
        <Tooltip text="ขยายเมนู" position="bottom">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="ขยายเมนู"
            className={`nav-expand-rail mx-auto mb-1 ${iconBtn}`}
          >
            <ExpandMenuIcon className="h-[18px] w-[18px]" aria-hidden />
          </button>
        </Tooltip>
        {/* Menu rows in the collapsed rail show their label as the CSS tooltip in globals.css
            (it only exists while collapsed, so no shared Tooltip here: that would show twice). */}
        <ul className="flex flex-col gap-0.5">
          {main.map((item, i) => {
            const on = item.href === active;
            const newGroup = item.group && item.group !== main[i - 1]?.group;
            return (
              <li key={item.href}>
                {newGroup && (
                  <h3
                    className={`nav-section-title px-3 pb-1.5 text-xs font-semibold tracking-wide text-sidebar-title ${i === 0 ? "pt-1" : "pt-5"}`}
                  >
                    {item.group}
                  </h3>
                )}
                <MenuLink item={item} on={on} />
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Sticky footer: settings sit at the very bottom, like the aoo apps */}
      {pinned.length > 0 && (
        <nav aria-label="เมนูท้าย" className="shrink-0 border-t border-line p-3">
          <ul className="flex flex-col gap-0.5">
            {pinned.map((item) => (
              <li key={item.href}>
                <MenuLink item={item} on={item.href === active} />
              </li>
            ))}
          </ul>
        </nav>
      )}
    </aside>
  );
}

/** One menu row. Collapsed rail: icon only, the label shows as the CSS tooltip in globals.css. */
function MenuLink({ item, on }: { item: MenuItem; on: boolean }) {
  const Icon = MENU_ICON[item.icon];
  return (
    <Link
      href={item.href}
      aria-label={item.label}
      aria-current={on ? "page" : undefined}
      className={`flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-sm transition-colors ${
        on
          ? "bg-sidebar-active font-semibold text-sidebar-active-ink"
          : "font-medium text-sidebar-ink hover:bg-sidebar-hover hover:text-sidebar-ink-hover"
      }`}
    >
      <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden />
      <span className="nav-label truncate" aria-hidden>
        {item.label}
      </span>
    </Link>
  );
}
