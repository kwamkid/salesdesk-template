// Filters shared by /overview, /team, /reports and /api/export. Plain functions, safe on server and client.

import { STAGES, type StageKey } from "@/config/stages";
import { addDaysISO, todayISO } from "@/lib/format";

export type Filters = {
  project: string | null;
  owner: string | null;
  stage: StageKey | null;
  from: string;
  to: string;
};

type Query = Record<string, string | string[] | undefined>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
export const isIsoDate = (v: unknown): v is string =>
  typeof v === "string" && ISO_DATE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export const QUICK_DAYS = [7, 30, 90] as const;
export const DEFAULT_DAYS = 30;

/** Date range of the last n days, ending today (Bangkok). */
export const lastDays = (n: number) => {
  const to = todayISO();
  return { from: addDaysISO(to, -(n - 1)), to };
};

/** Read filters from searchParams. Missing or bad dates fall back to the last 30 days. */
export function readFilters(q: Query): Filters {
  const def = lastDays(DEFAULT_DAYS);
  const project = first(q.project);
  const owner = first(q.owner);
  const stage = first(q.stage);
  let from = isIsoDate(first(q.from)) ? (first(q.from) as string) : def.from;
  let to = isIsoDate(first(q.to)) ? (first(q.to) as string) : def.to;
  if (from > to) [from, to] = [to, from];
  return {
    project: isUuid(project) ? project : null,
    owner: isUuid(owner) ? owner : null,
    stage: STAGES.some((s) => s.key === stage) ? (stage as StageKey) : null,
    from,
    to,
  };
}

/** Query string for links that keep the current filters. Empty values are left out. */
export function toQuery(values: Record<string, string | null | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(values)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** Number of days in the range, both ends included. */
export const rangeDays = (f: Pick<Filters, "from" | "to">) =>
  Math.round((Date.parse(`${f.to}T00:00:00Z`) - Date.parse(`${f.from}T00:00:00Z`)) / 86_400_000) + 1;

/** Today in Bangkok with the Buddhist year, for file names: "2569-11-23". */
export const thaiFileDate = () => {
  const [y, m, d] = todayISO().split("-");
  return `${Number(y) + 543}-${m}-${d}`;
};

/** Percent of part over whole, or null when whole is 0. */
export const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : null);

/** Audience groups for the Meta file (keys are the p_group values of export_meta_audience). */
export const META_GROUPS: Record<string, string> = {
  unqualified: "ไม่มีคุณภาพ",
  lost: "ไม่ซื้อ",
  visited: "มาชมแล้ว",
  reserved: "จองขึ้นไป",
  all: "ทั้งหมด",
};
