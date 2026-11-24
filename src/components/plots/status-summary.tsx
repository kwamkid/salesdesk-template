import { StatusTabs, type StatusTab } from "@/components/ui/status-tabs";
import { UNIT_STATUS, type UnitStatus } from "@/config/units";
import { baht } from "@/lib/format";
import { isFree, type BoardUnit } from "./types";

/** "all" or one plot status. */
export type PlotFilter = "all" | UnitStatus;

export const isPlotFilter = (v: string | undefined): v is PlotFilter =>
  v === "all" || UNIT_STATUS.some((s) => s.key === v);

/** Status tabs (ทั้งหมด · ว่าง · มีคนสนใจ · จอง · ทำสัญญา · โอน) with counts, and the total price
 *  of plots still free (available + interested).
 *  - On the plot page: `active` + `onSelect` filter the board in place (Client Component).
 *  - Elsewhere (Server Component): `projectId` turns each tab into a link to /plots?project=…&status=…. */
export function StatusSummary({
  units,
  active = "all",
  onSelect,
  projectId,
}: {
  units: Pick<BoardUnit, "status" | "price">[];
  active?: PlotFilter;
  onSelect?: (key: PlotFilter) => void;
  projectId?: string;
}) {
  const count = (k: string) => units.filter((u) => u.status === k).length;
  const freeValue = units.filter((u) => isFree(u.status)).reduce((sum, u) => sum + Number(u.price ?? 0), 0);
  const href = (k: PlotFilter) =>
    projectId && !onSelect ? `/plots?project=${projectId}${k === "all" ? "" : `&status=${k}`}` : undefined;

  const tabs: StatusTab[] = [
    { key: "all", label: "ทั้งหมด", count: units.length, href: href("all") },
    ...UNIT_STATUS.map((s) => ({ key: s.key, label: s.label, count: count(s.key), tone: s.tone, href: href(s.key) })),
  ];

  return (
    <section aria-label="สรุปสถานะแปลง" className="flex min-w-0 flex-col gap-2">
      <StatusTabs
        tabs={tabs}
        activeKey={onSelect || projectId ? active : ""}
        onSelect={onSelect ? (k) => onSelect(k as PlotFilter) : undefined}
        ariaLabel="กรองตามสถานะแปลง"
      />
      <p className="text-sm text-ink-soft">
        มูลค่าแปลงที่ยังว่าง (ว่าง + มีคนสนใจ) <span className="font-medium text-ink">{baht(freeValue)}</span>
      </p>
    </section>
  );
}
