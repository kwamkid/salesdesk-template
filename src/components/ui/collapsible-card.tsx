/**
 * <CollapsibleCard> — a card whose body opens and closes (aoocommerce CollapsibleCard.tsx).
 * Built on <details>, so it works in server pages and without JavaScript.
 *
 * <CollapsibleCard title="7 วันข้างหน้า" summary="12 งาน">…</CollapsibleCard>
 */
import type { ReactNode } from "react";
import { ChevronDownIcon } from "@/lib/icons";

export function CollapsibleCard({
  title,
  summary,
  action,
  defaultOpen = false,
  children,
  className = "",
}: {
  title: ReactNode;
  /** Short text next to the title (e.g. a count) */
  summary?: ReactNode;
  /** Shown on the right of the header, outside the toggle */
  action?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details open={defaultOpen} className={`group rounded-card border border-line bg-surface shadow-card ${className}`}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2">
          <ChevronDownIcon className="h-5 w-5 shrink-0 text-ink-soft transition-transform group-open:rotate-180" aria-hidden />
          <span className="truncate text-lg font-semibold">{title}</span>
          {summary && <span className="shrink-0 text-sm text-ink-soft">{summary}</span>}
        </span>
        {action}
      </summary>
      <div className="border-t border-line p-4">{children}</div>
    </details>
  );
}
