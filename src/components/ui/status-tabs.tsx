"use client";

/**
 * <StatusTabs> — the status filter row above a list (ported from aoocommerce StatusTabs.tsx).
 * Each tab: small label + big count. The active tab is solid, the others a soft tint of the
 * same colour. Scrolls sideways on phones.
 *
 * Works in server pages: give each tab an `href` (the page URL with the filter param), so the
 * filter lives in the URL. In client code pass `onSelect` instead.
 *
 * <StatusTabs activeKey={stage ?? "all"} tabs={[
 *   { key: "all", label: "ทั้งหมด", count: 120, href: "/leads" },
 *   { key: "new", label: "ลีดใหม่", count: 12, tone: "neutral", href: "/leads?stage=new" },
 * ]} />
 */
import Link from "next/link";
import { Tooltip } from "./tooltip";

/** Colour of a tab. "all" = dark ink. */
export type StatusTabTone = "all" | "neutral" | "brand" | "warn" | "ok" | "danger" | "info" | "purple";

export interface StatusTab {
  key: string;
  label: string;
  count?: number;
  /** Default: "all" for key "all", otherwise "neutral". */
  tone?: StatusTabTone;
  href?: string;
  /** One line shown on hover / long press */
  tooltip?: string;
  hidden?: boolean;
}

// Written out in full so Tailwind finds every class.
const ACTIVE: Record<StatusTabTone, string> = {
  all: "bg-ink text-surface",
  neutral: "bg-ink-soft text-surface",
  brand: "bg-brand text-brand-ink",
  warn: "bg-warn-ink text-warn-soft",
  ok: "bg-ok text-surface",
  danger: "bg-danger text-danger-ink",
  info: "bg-info text-surface",
  purple: "bg-purple text-surface",
};
const INACTIVE: Record<StatusTabTone, string> = {
  all: "bg-line text-ink",
  neutral: "bg-bg text-ink-soft border border-line",
  brand: "bg-brand-soft text-brand",
  warn: "bg-warn-soft text-warn-ink",
  ok: "bg-ok-soft text-ok",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  purple: "bg-purple-soft text-purple",
};

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
    <nav aria-label={ariaLabel} className={`-mx-2 overflow-x-auto px-2 pb-1 sm:mx-0 sm:px-0 ${className}`}>
      <ul className="flex w-max gap-2">
        {tabs
          .filter((t) => !t.hidden)
          .map((t) => {
            const tone = t.tone ?? (t.key === "all" ? "all" : "neutral");
            const active = t.key === activeKey;
            const cls = `flex min-h-11 min-w-20 flex-col items-center justify-center rounded-card px-4 py-1.5 text-center transition-opacity ${
              active ? `${ACTIVE[tone]} shadow-md` : `${INACTIVE[tone]} hover:opacity-80`
            }`;
            const body = (
              <>
                <span className={`text-xs font-medium whitespace-nowrap ${active ? "opacity-90" : ""}`}>{t.label}</span>
                {t.count !== undefined && (
                  <span className="text-xl leading-tight font-bold tabular-nums">{t.count.toLocaleString("th-TH")}</span>
                )}
              </>
            );
            return (
              <li key={t.key}>
                <Tooltip text={t.tooltip ?? ""}>
                  {t.href ? (
                    <Link href={t.href} scroll={false} aria-current={active ? "page" : undefined} className={cls}>
                      {body}
                    </Link>
                  ) : (
                    <button type="button" aria-pressed={active} onClick={() => onSelect?.(t.key)} className={cls}>
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
