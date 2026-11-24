import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export type TileTone = "brand" | "info" | "ok" | "warn" | "purple";

const BUBBLE: Record<TileTone, string> = {
  brand: "bg-brand-soft text-brand",
  info: "bg-info-soft text-info",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn-ink",
  purple: "bg-purple-soft text-purple",
};

export type Tile = { href: string; title: string; sub: string; icon: LucideIcon; tone: TileTone; badge?: number };

/** A grid of big tappable cards that open other pages (pages kept out of the menu: users, projects, reports …).
 *  `badge` shows a red count when something waits there. */
export function LinkTiles({ tiles }: { tiles: Tile[] }) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tiles.map((t) => (
        <li key={t.href}>
          <Link
            href={t.href}
            className="flex min-h-11 items-center gap-3 rounded-card border border-line bg-surface p-4 transition-all hover:-translate-y-0.5 hover:shadow-card"
          >
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${BUBBLE[t.tone]}`}>
              <t.icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink">{t.title}</span>
              <span className="block text-sm text-ink-soft">{t.sub}</span>
            </span>
            {!!t.badge && (
              <span className="rounded-full bg-danger px-2.5 py-0.5 text-sm font-semibold text-brand-ink" aria-label={`รอ ${t.badge} รายการ`}>
                {t.badge}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
