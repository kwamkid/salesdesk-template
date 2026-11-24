import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { SectionTitle, type SoftTone } from "@/components/ui/card";
import { num } from "@/lib/format";
import { getTabColor } from "@/lib/status-colors";

/** Big number tile (stat card). `color` = a status key from src/lib/status-colors.ts for the icon bubble.
 *  `note` carries the meaning in text, never by color alone. */
export function Kpi({
  label,
  value,
  note,
  tone = "neutral",
  href,
  icon: Icon,
  color = "all",
}: {
  label: string;
  value: number | string;
  note?: string;
  tone?: "neutral" | "danger";
  href?: string;
  icon?: LucideIcon;
  color?: string;
}) {
  const c = getTabColor(tone === "danger" ? "overdue" : color);
  const body = (
    <>
      <span className="flex items-center gap-2">
        {Icon && (
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${c.inactive} ${c.labelColor}`}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </span>
        )}
        <span className="text-sm font-medium text-ink-soft">{label}</span>
      </span>
      <span
        className={`text-3xl font-bold tabular-nums ${tone === "danger" ? "text-danger" : "text-ink"}`}
      >
        {typeof value === "number" ? num(value) : value}
      </span>
      {note && <span className="text-xs text-ink-soft">{note}</span>}
    </>
  );
  const cls = `flex min-h-11 flex-col gap-2 rounded-card border bg-surface p-4 shadow-card transition-all ${
    tone === "danger" ? "border-danger" : "border-line"
  } ${href ? "hover:-translate-y-0.5" : ""}`;
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Funnel picture: one band per stage, narrowing down, in the stage's status colour.
 *  Each band says its number and the % that moved on from the stage before (text, not colour alone). */
export function FunnelChart({
  steps,
  dropped,
}: {
  steps: { key: string; label: string; count: number }[];
  /** Leads of the same range that dropped out, shown under the funnel. */
  dropped?: { key: string; label: string; count: number }[];
}) {
  const max = Math.max(...steps.map((x) => x.count), 1);
  return (
    <ol className="flex flex-col items-center gap-1.5" aria-label="Funnel ลูกค้า">
      {steps.map((x, i) => {
        // Width shrinks with the count but never below 28% so the label still fits.
        const w = 28 + (x.count / max) * 72;
        const c = getTabColor(x.key);
        return (
          <li key={x.key} className="flex w-full flex-col items-center">
            <div
              className={`flex min-h-12 items-center justify-center gap-2 px-6 text-white ${c.active}`}
              style={{
                width: `${w}%`,
                clipPath:
                  "polygon(0 0, 100% 0, calc(100% - 12px) 100%, 12px 100%)",
              }}
            >
              <span className="truncate text-sm font-medium">{x.label}</span>
              <span className="text-lg font-bold tabular-nums">
                {num(x.count)}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span className="py-0.5 text-xs font-medium text-ink-soft">
                ▼{" "}
                {x.count > 0
                  ? `ไปต่อ ${Math.round((steps[i + 1].count / x.count) * 100)}%`
                  : ""}
              </span>
            )}
          </li>
        );
      })}
      {dropped && dropped.length > 0 && (
        <li className="mt-3 flex w-full flex-col items-center gap-2 border-t border-line pt-3">
          <span className="text-sm font-medium text-ink-soft">
            ไม่ผ่าน (หลุดระหว่างทาง)
          </span>
          <span className="flex flex-wrap justify-center gap-2">
            {dropped.map((d) => {
              const c = getTabColor(d.key);
              return (
                <span
                  key={d.key}
                  className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm ${c.inactive}`}
                >
                  <span className={c.labelColor}>{d.label}</span>
                  <span className={`font-bold tabular-nums ${c.countColor}`}>
                    {num(d.count)}
                  </span>
                </span>
              );
            })}
          </span>
        </li>
      )}
    </ol>
  );
}

/** Where every open customer is right now: total, then one row per stage with its number, a bar and %. */
export function PipelineBar({
  parts,
}: {
  parts: { key: string; label: string; count: number }[];
}) {
  const total = parts.reduce((a, p) => a + p.count, 0);
  if (!total)
    return <p className="text-sm text-ink-soft">ยังไม่มีลูกค้าที่กำลังคุยอยู่</p>;
  const max = Math.max(...parts.map((p) => p.count), 1);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-soft">
        ยังคุยอยู่ทั้งหมด{" "}
        <span className="text-2xl font-bold text-ink tabular-nums">
          {num(total)}
        </span>{" "}
        คน
      </p>
      <ul className="flex flex-col gap-2.5">
        {parts.map((p) => {
          const c = getTabColor(p.key);
          return (
            <li
              key={p.key}
              className="grid grid-cols-[8rem_3rem_1fr_3rem] items-center gap-3 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.active}`}
                  aria-hidden
                />
                <span className="truncate">{p.label}</span>
              </span>
              <span className="text-right text-base font-semibold tabular-nums">
                {num(p.count)}
              </span>
              <span
                className="h-2.5 overflow-hidden rounded-full bg-line"
                aria-hidden
              >
                <span
                  className={`block h-full rounded-full ${c.active}`}
                  style={{ width: `${(p.count / max) * 100}%` }}
                />
              </span>
              <span className="text-right text-ink-soft tabular-nums">
                {Math.round((p.count / total) * 100)}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
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
      <div
        className="h-3 w-full overflow-hidden rounded-full bg-line"
        aria-hidden
      >
        <div
          className={`h-full rounded-full ${fill}`}
          style={{ width: `${width}%` }}
        />
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
        <SectionTitle
          icon={icon}
          tone={tone}
          title={title}
          sub={sub}
          action={action}
        />
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
