import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { SectionTitle, type SoftTone } from "@/components/ui/card";
import { num } from "@/lib/format";

/** Big number tile. `note` carries the meaning in text, never by color alone. */
export function Kpi({
  label,
  value,
  note,
  tone = "neutral",
  href,
}: {
  label: string;
  value: number | string;
  note?: string;
  tone?: "neutral" | "danger";
  href?: string;
}) {
  const body = (
    <>
      <span className="text-sm text-ink-soft">{label}</span>
      <span className={`text-2xl font-semibold ${tone === "danger" ? "text-danger" : "text-ink"}`}>
        {typeof value === "number" ? num(value) : value}
      </span>
      {note && <span className="text-xs text-ink-soft">{note}</span>}
    </>
  );
  const cls = `flex min-h-11 flex-col gap-1 rounded-card border border-line bg-surface p-4 ${
    tone === "danger" ? "border-danger" : ""
  }`;
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** One horizontal bar with its label and number written out. Width is relative to `max`. */
export function Bar({
  label,
  value,
  max,
  note,
  tone = "brand",
}: {
  label: ReactNode;
  value: number;
  max: number;
  note?: string;
  tone?: "brand" | "ok" | "danger";
}) {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0;
  const fill = { brand: "bg-brand", ok: "bg-ok", danger: "bg-danger" }[tone];
  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="whitespace-nowrap">
          <span className="font-semibold">{num(value)}</span>
          {note && <span className="text-ink-soft"> · {note}</span>}
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-line" aria-hidden>
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${width}%` }} />
      </div>
    </li>
  );
}

/** Section with a heading inside a card. With `icon` the heading gets a tinted icon badge (SectionTitle). */
export function Section({
  title,
  sub,
  action,
  icon,
  tone,
  children,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
  icon?: LucideIcon;
  tone?: SoftTone;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
      {icon ? (
        <SectionTitle icon={icon} tone={tone} title={title} sub={sub} action={action} />
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {sub && <p className="text-sm text-ink-soft">{sub}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
