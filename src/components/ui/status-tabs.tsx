"use client";

/**
 * <StatusTabs> — the status filter row above a list. Central template: aoo-techstack/ui/templates/status-tabs.tsx
 * (colours copied from there; keep them in sync). Each tab: small label + big count. The active tab is solid,
 * the others a soft tint of the same colour. Scrolls sideways on phones.
 *
 * Colours come from the registry below only: never write a status colour in a page. A new status → add an
 * alias in STATUS_KEY_ALIASES. Lead stages (src/config/stages.ts) are mapped here already.
 *
 * Server pages: give each tab an `href` (URL with the filter param). Client code: pass `onSelect`.
 * <StatusTabs activeKey={stage ?? "all"} tabs={[{ key: "all", label: "ทั้งหมด", count: 120, href: "/leads" }, …]} />
 */
import Link from "next/link";
import { Tooltip } from "./tooltip";

import {
  getTabColor,
  STATUS_KEY_ALIASES,
  STATUS_TAB_COLORS,
} from "@/lib/status-colors";

export { getTabColor };

/** Older pages pass a tone instead of a status key. */
export type StatusTabTone =
  "all" | "neutral" | "brand" | "warn" | "ok" | "danger" | "info" | "purple";
const TONE_KEY: Record<StatusTabTone, string> = {
  all: "all",
  neutral: "cancelled",
  brand: "pending_confirm",
  warn: "partially_paid",
  ok: "completed",
  danger: "overdue",
  info: "new",
  purple: "processing",
};

export interface StatusTab {
  /** Status key: picks the colour and is compared with activeKey. */
  key: string;
  label: string;
  /** Big number under the label. */
  count?: number;
  /** Use another key's colour (a sub-tab in its parent's colour). */
  colorKey?: string;
  /** @deprecated use colorKey or a status key */
  tone?: StatusTabTone;
  href?: string;
  /** One line shown on hover / long press */
  tooltip?: string;
  hidden?: boolean;
}

export function StatusTabs({
  tabs,
  activeKey,
  onSelect,
  ariaLabel = "กรองตามสถานะ",
  className = "",
}: {
  tabs: StatusTab[];
  activeKey: string;
  onSelect?: (key: string) => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <nav
      aria-label={ariaLabel}
      className={`-mx-2 overflow-x-auto px-2 pb-1 sm:mx-0 sm:px-0 ${className}`}
    >
      <ul className="flex w-max gap-2">
        {tabs
          .filter((t) => !t.hidden)
          .map((t) => {
            const color = getTabColor(
              t.colorKey ??
                (t.key in STATUS_TAB_COLORS || t.key in STATUS_KEY_ALIASES
                  ? t.key
                  : TONE_KEY[t.tone ?? "neutral"]),
            );
            const active = t.key === activeKey;
            const cls = `flex min-h-11 min-w-20 shrink-0 flex-col items-center justify-center rounded-xl px-4 py-2 text-center transition-all ${
              active
                ? `${color.active} text-white shadow-md`
                : `${color.inactive} hover:opacity-80`
            }`;
            const body = (
              <>
                <span
                  className={`text-xs font-medium whitespace-nowrap ${active ? "text-white/80" : color.labelColor}`}
                >
                  {t.label}
                </span>
                {t.count !== undefined && (
                  <span
                    className={`text-xl leading-tight font-bold tabular-nums ${active ? "text-white" : color.countColor}`}
                  >
                    {t.count.toLocaleString("th-TH")}
                  </span>
                )}
              </>
            );
            return (
              <li key={t.key}>
                <Tooltip text={t.tooltip ?? ""}>
                  {t.href ? (
                    <Link
                      href={t.href}
                      scroll={false}
                      aria-current={active ? "page" : undefined}
                      className={cls}
                    >
                      {body}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => onSelect?.(t.key)}
                      className={cls}
                    >
                      {body}
                    </button>
                  )}
                </Tooltip>
              </li>
            );
          })}
      </ul>
    </nav>
  );
}
