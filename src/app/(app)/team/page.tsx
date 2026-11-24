import { Kpi } from "@/components/reports/charts";
import { loadPerformance, type SalesPerf } from "@/components/reports/data";
import { FilterBar } from "@/components/reports/filter-bar";
import { readFilters } from "@/components/reports/params";
import { SalesCard } from "@/components/reports/sales-card";
import { EmptyState, Notice, PageTitle } from "@/components/ui/card";
import { requireMe } from "@/lib/auth";
import { thDate, todayISO } from "@/lib/format";
import { TeamIcon } from "@/lib/icons";
import { getScope } from "@/lib/project-scope";

export const metadata = { title: "ทีมขาย" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TeamPage({ searchParams }: Props) {
  const me = await requireMe(["executive", "admin"]);
  const scope = await getScope(me.role);
  const sp = await searchParams;
  // Opens on today; the date picker in the title row changes it.
  const today = todayISO();
  const f = readFilters({
    project: scope.current?.id,
    from: today,
    to: today,
    ...sp,
  });
  const rows = await loadPerformance(f);
  const sum = (k: keyof SalesPerf) =>
    (rows ?? []).reduce((a, r) => a + Number(r[k] || 0), 0);
  const range =
    f.from === f.to
      ? f.from === today
        ? "วันนี้"
        : thDate(f.from)
      : `${thDate(f.from)} ถึง ${thDate(f.to)}`;
  // Who needs help first: most overdue, then most closed.
  const sorted = (rows ?? [])
    .slice()
    .sort((a, b) => b.overdue_now - a.overdue_now || b.closed - a.closed);

  return (
    <>
      <PageTitle
        title="ทีมขาย"
        sub={`${scope.current?.name ?? "ทุกโครงการ"} · ผลงาน${range}`}
        action={<FilterBar inline path="/team" values={f} />}
      />

      {!rows ? (
        <Notice tone="danger">
          โหลดผลงานทีมขายไม่สำเร็จ ถ้าเพิ่งอัปเดตระบบ ให้แอดมินรัน SQL ไฟล์ 0017 ก่อน
          แล้วรีเฟรชหน้านี้
        </Notice>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={TeamIcon}
          tone="ok"
          title="ยังไม่มีเซลส์ในระบบ"
          hint="เชิญเซลส์ได้ที่ ตั้งค่า → พนักงาน"
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi
              label="เลยกำหนดทั้งทีม"
              value={sum("overdue_now")}
              tone={sum("overdue_now") > 0 ? "danger" : "neutral"}
              note="ณ ตอนนี้"
            />
            <Kpi
              label="ติดต่อแล้ว"
              value={sum("contacted")}
              note={`ลูกค้าที่คุย${range}`}
            />
            <Kpi
              label="นัดชม"
              value={sum("appointments")}
              color="appointment"
              note={range}
            />
            <Kpi
              label="ปิดได้ (จอง)"
              value={sum("closed")}
              color="reserved"
              note={range}
            />
          </div>
          <div className="grid items-start gap-4 xl:grid-cols-2">
            {sorted.map((p) => (
              <SalesCard key={p.owner_id} p={p} />
            ))}
          </div>
          <p className="lbl">
            ตัวเลขใช้ประกอบการคุยกับทีม
            เซลส์ที่ถือโครงการขายยากหรือได้ลีดคุณภาพต่ำอาจดูแย่กว่าความจริง
          </p>
        </>
      )}
    </>
  );
}
