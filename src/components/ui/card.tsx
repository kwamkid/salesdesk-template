import type { LucideIcon } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { stageOf, type StageTone } from "@/config/stages";

type CardPadding = "none" | "sm" | "md" | "lg";

const PAD: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-4 sm:p-5",
  lg: "p-4 sm:p-6",
};

/** Surface card, like aoocommerce's Card: 1px border, small shadow, 8px corners.
 *  A `p-*` in className replaces the preset padding. */
export function Card({ className = "", padding = "md", flat, ...rest }: HTMLAttributes<HTMLDivElement> & { padding?: CardPadding; flat?: boolean }) {
  const pad = /(^|\s)p-\d/.test(className) ? "" : PAD[padding];
  return <div className={`rounded-card border border-line bg-surface ${flat ? "" : "shadow-card"} ${pad} ${className}`} {...rest} />;
}

const TONE: Record<StageTone, string> = {
  neutral: "bg-line text-ink",
  brand: "bg-brand-soft text-brand",
  warn: "bg-warn-soft text-warn-ink",
  ok: "bg-ok-soft text-ok",
  danger: "bg-danger-soft text-danger",
};

/** Small pill. Status is never shown by color alone, so it always carries text. */
export function Badge({ tone = "neutral", children }: { tone?: StageTone; children: ReactNode }) {
  return (
    <span className={`inline-flex h-6 shrink-0 items-center rounded-full px-2 text-xs font-medium whitespace-nowrap ${TONE[tone]}`}>
      {children}
    </span>
  );
}

export function StageBadge({ stage }: { stage: string }) {
  const s = stageOf(stage);
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

/** Soft tints for icon badges and stat tiles: a -soft background with its matching text color. */
export type SoftTone = "brand" | "ok" | "warn" | "danger" | "info" | "purple" | "neutral";

export const SOFT: Record<SoftTone, string> = {
  brand: "bg-brand-soft text-brand",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn-ink",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  purple: "bg-purple-soft text-purple",
  neutral: "bg-bg text-ink-soft",
};

/** Badge box (always square, so lg is a true circle). */
const BADGE_REM = { sm: "2rem", md: "2.5rem", lg: "4rem" } as const;

const BADGE_SIZE = {
  sm: "rounded-control [&>svg]:h-4 [&>svg]:w-4",
  md: "rounded-control [&>svg]:h-5 [&>svg]:w-5",
  lg: "rounded-full [&>svg]:h-8 [&>svg]:w-8",
};

/** Icon on a tinted square (or circle at lg). Decorative: the text next to it carries the meaning. */
export function IconBadge({ icon: Icon, tone = "brand", size = "sm" }: { icon: LucideIcon; tone?: SoftTone; size?: keyof typeof BADGE_SIZE }) {
  return (
    <span
      aria-hidden
      style={{ width: BADGE_REM[size], height: BADGE_REM[size] }}
      className={`inline-flex shrink-0 items-center justify-center ${BADGE_SIZE[size]} ${SOFT[tone]}`}
    >
      <Icon strokeWidth={1.75} />
    </span>
  );
}

/** Small number tile with a tinted icon: label on top, value below, optional note. */
export function StatTile({
  icon,
  label,
  value,
  note,
  tone = "brand",
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  note?: string;
  tone?: SoftTone;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-card border border-line bg-surface p-3 shadow-card sm:p-4">
      <IconBadge icon={icon} tone={tone} size="md" />
      <div className="min-w-0">
        <p className="truncate text-sm text-ink-soft">{label}</p>
        <p className="truncate text-xl font-semibold text-ink">{value}</p>
        {note && <p className="truncate text-xs text-ink-soft">{note}</p>}
      </div>
    </div>
  );
}

/** Section heading inside a card: tinted icon badge + title (+ hint), optional action on the right. */
export function SectionTitle({
  icon,
  title,
  sub,
  tone = "brand",
  action,
  as: Tag = "h2",
}: {
  icon: LucideIcon;
  title: ReactNode;
  sub?: ReactNode;
  tone?: SoftTone;
  action?: ReactNode;
  as?: "h2" | "h3";
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <IconBadge icon={icon} tone={tone} />
        <div className="min-w-0">
          <Tag className="text-lg leading-8 font-semibold">{title}</Tag>
          {sub && <p className="text-sm text-ink-soft">{sub}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/** Shown instead of a blank page when a list has nothing in it. Pass an `icon` for a friendlier screen. */
export function EmptyState({
  title,
  hint,
  action,
  icon,
  tone = "brand",
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  icon?: LucideIcon;
  tone?: SoftTone;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line-strong bg-surface px-6 py-10 text-center">
      {icon && <IconBadge icon={icon} tone={tone} size="lg" />}
      <div className="flex max-w-md flex-col gap-1">
        <p className="text-lg font-semibold text-ink">{title}</p>
        {hint && <p className="text-sm text-ink-soft">{hint}</p>}
      </div>
      {action && <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function Loading({ label = "กำลังโหลด" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 p-8 text-sm text-ink-soft">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-brand" aria-hidden />
      {label}
    </div>
  );
}

/** Result message at the top of a form or page. */
export function Notice({ tone = "ok", children }: { tone?: "ok" | "warn" | "danger"; children: ReactNode }) {
  return (
    <p role="status" className={`rounded-control px-3 py-2 text-sm ${TONE[tone]}`}>
      {children}
    </p>
  );
}

/** Page header, like aoocommerce's PageHeader: (icon) + big bold title + subtitle, buttons on the right.
 *  Buttons share the title's line while the title keeps 14rem; otherwise they wrap below. */
export function PageTitle({ title, sub, action, icon }: { title: string; sub?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <header className="flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-4">
      <div className="flex min-w-0 flex-[1_1_14rem] items-start gap-3">
        {icon && <div className="flex h-10 shrink-0 items-center text-brand [&>svg]:h-8 [&>svg]:w-8">{icon}</div>}
        <div className="min-w-0">
          <h1 className="text-page font-bold break-words text-ink sm:text-page-lg">{title}</h1>
          {sub && <p className="mt-1 text-ink-soft">{sub}</p>}
        </div>
      </div>
      {action && <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </header>
  );
}
