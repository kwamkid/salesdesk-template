import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { num } from "@/lib/format";
import { getTabColor } from "@/lib/status-colors";
import type { SalesPerf } from "./data";

/** One sales person at a glance: who needs chasing now (red), then what they did in the chosen days.
 *  Numbers carry their meaning in words, colours only help. */
export function SalesCard({ p }: { p: SalesPerf }) {
  const stat = (label: string, value: number, colorKey?: string) => {
    const c = colorKey ? getTabColor(colorKey) : null;
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-control px-2 py-2 ${c ? c.inactive : "bg-bg"}`}
      >
        <span
          className={`text-2xl font-bold tabular-nums ${c ? c.countColor : "text-ink"}`}
        >
          {num(value)}
        </span>
        <span className="lbl text-center">{label}</span>
      </div>
    );
  };
  return (
    <article className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
      <header className="flex items-center gap-3">
        <Avatar name={p.owner_name || "-"} url={p.avatar_url} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold">
            {p.owner_name || "-"}
          </h3>
          <p className="lbl">ลูกค้าในมือ {num(p.open_now)} คน</p>
        </div>
        <Link
          href={`/leads?owner=${p.owner_id}`}
          className="link text-sm whitespace-nowrap"
        >
          ดูลูกค้า
        </Link>
      </header>

      {/* Right now */}
      <div className="grid grid-cols-2 gap-2">
        <div
          className={`flex items-center justify-between rounded-control px-3 py-2 ${p.overdue_now > 0 ? "bg-danger-soft" : "bg-bg"}`}
        >
          <span className="lbl">เลยกำหนด</span>
          <span
            className={`text-xl font-bold tabular-nums ${p.overdue_now > 0 ? "text-danger" : "text-ink"}`}
          >
            {num(p.overdue_now)}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-control bg-bg px-3 py-2">
          <span className="lbl">ต้องตามวันนี้</span>
          <span className="text-xl font-bold tabular-nums">
            {num(p.due_today)}
          </span>
        </div>
      </div>

      {/* In the chosen days */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {stat("ลีดใหม่", p.new_leads, "new")}
        {stat("ติดต่อแล้ว", p.contacted)}
        {stat("นัดชม", p.appointments, "appointment")}
        {stat("มาชม", p.visits, "visited")}
        {stat("ปิดได้ (จอง)", p.closed, "reserved")}
        {stat("ไม่ซื้อ", p.lost, "lost")}
      </div>
    </article>
  );
}
