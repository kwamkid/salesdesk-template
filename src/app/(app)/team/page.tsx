import { loadProjects, loadTeam } from "@/components/reports/data";
import { FilterBar } from "@/components/reports/filter-bar";
import { pct, readFilters } from "@/components/reports/params";
import { StatTable } from "@/components/reports/stat-table";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState, Notice, PageTitle } from "@/components/ui/card";
import { loadAvatars } from "@/components/ui/load-avatars";
import { requireMe } from "@/lib/auth";
import { num, thDate } from "@/lib/format";
import { TeamIcon } from "@/lib/icons";

export const metadata = { title: "ทีมขาย" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function TeamPage({ searchParams }: Props) {
  await requireMe(["executive", "admin"]);
  const f = readFilters(await searchParams);
  const [projects, rows] = await Promise.all([loadProjects(), loadTeam(f)]);
  const pics = await loadAvatars((rows ?? []).map((s) => s.owner_id));

  return (
    <>
      <PageTitle title="ทีมขาย" sub={`ลีดที่เข้ามา ${thDate(f.from)} ถึง ${thDate(f.to)} · กดชื่อเพื่อดูลูกค้าของเซลส์คนนั้น`} />
      <FilterBar path="/team" values={f} projects={projects} />

      <Notice tone="warn">
        ตัวเลขบอกปริมาณงานและผลลัพธ์ แต่เซลส์ที่ถือโครงการขายยากหรือได้ลีดคุณภาพต่ำจะดูแย่กว่าความจริง
        ใช้ประกอบการคุยกับทีม ไม่ใช้ตัดสินแทน
      </Notice>

      {!rows ? (
        <Notice tone="danger">โหลดข้อมูลทีมขายไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง</Notice>
      ) : rows.length === 0 ? (
        <EmptyState icon={TeamIcon} tone="ok" title="ยังไม่มีเซลส์ในระบบ" hint="แอดมินเชิญเซลส์ได้ที่เมนูผู้ใช้" />
      ) : (
          <StatTable
            titleLabel="เซลส์"
            storageKey="salesdesk.team"
            columns={[
              { label: "ลีดที่ถือ" },
              { label: "กิจกรรม/สัปดาห์" },
              { label: "ติดต่อแรก (ชม.)" },
              { label: "เลยกำหนด" },
              { label: "นัดชม" },
              { label: "มาชม" },
              { label: "จอง" },
              { label: "ไม่ซื้อ" },
            ]}
            rows={rows.map((s) => {
              const rate = pct(s.reservations, s.leads_in_range);
              return {
                key: s.owner_id,
                sortTitle: s.owner_name || "-",
                title: (
                  <span className="flex items-center gap-2">
                    <Avatar name={s.owner_name || "-"} url={pics[s.owner_id]} size="md" />
                    <span className="flex min-w-0 flex-col">
                      <span>{s.owner_name || "-"}</span>
                      <span className="text-xs font-normal text-ink-soft">
                        ลีดใหม่ {num(s.leads_in_range)} · จอง {rate === null ? "-" : `${rate}%`}
                      </span>
                    </span>
                  </span>
                ),
                href: `/leads?owner=${s.owner_id}`,
                linkLabel: "ดูลูกค้า",
                cells: [
                  num(s.leads_open),
                  num(s.activities_per_week),
                  s.avg_hours_to_first_contact === null ? "-" : num(s.avg_hours_to_first_contact),
                  s.overdue > 0 ? `เลย ${num(s.overdue)}` : "0",
                  num(s.appointments),
                  num(s.visits),
                  num(s.reservations),
                  s.lost > 0 && s.top_lost_reason ? `${num(s.lost)} (${s.top_lost_reason})` : num(s.lost),
                ],
              };
            })}
          />
      )}
    </>
  );
}
