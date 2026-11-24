import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

const LABEL: Record<string, string> = {
  new_leads: "ลีดใหม่",
  activities: "กิจกรรมที่บันทึก",
  appointments: "นัดชม",
  reservations: "จอง",
};

/** "ผลงานเดือนนี้" on /me for sales: this month next to last month, from one RPC. */
export async function MonthStats() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_month_stats");
  const rows = (data ?? []) as { metric: string; this_month: number; last_month: number }[];

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">ผลงานเดือนนี้</h2>
      <ul className="grid grid-cols-2 gap-3">
        {rows.map((r) => {
          const now = Number(r.this_month);
          const last = Number(r.last_month);
          const diff = now - last;
          return (
            <li key={r.metric} className="flex flex-col rounded-control bg-bg p-3">
              <span className="lbl">{LABEL[r.metric] ?? r.metric}</span>
              <span className="text-2xl font-semibold">{now.toLocaleString("th-TH")}</span>
              <span className="text-xs text-ink-soft">
                เดือนก่อน {last.toLocaleString("th-TH")}
                {diff !== 0 && ` (${diff > 0 ? "เพิ่มขึ้น" : "ลดลง"} ${Math.abs(diff).toLocaleString("th-TH")})`}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
