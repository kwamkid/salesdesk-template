import Link from "next/link";
import {
  Bar,
  FunnelChart,
  Kpi,
  PipelineBar,
  Section,
} from "@/components/reports/charts";
import { loadDashboard } from "@/components/reports/data";
import { FilterBar } from "@/components/reports/filter-bar";
import { pct, readFilters, toQuery } from "@/components/reports/params";
import { StatTable } from "@/components/reports/stat-table";
import { AvatarName } from "@/components/ui/avatar";
import { EmptyState, Notice, PageTitle } from "@/components/ui/card";
import { LinkTiles } from "@/components/ui/link-tiles";
import { MENU_ICON } from "@/lib/icons";
import { loadAvatars } from "@/components/ui/load-avatars";
import { STAGES, stageOf } from "@/config/stages";
import { requireMe } from "@/lib/auth";
import { getScope } from "@/lib/project-scope";
import { baht, num, thDate } from "@/lib/format";
import {
  AppointmentIcon,
  CampaignIcon,
  FunnelIcon,
  NewLeadIcon,
  ReservedIcon,
  TransferIcon,
  LostReasonIcon,
  NoDataIcon,
  ProjectIcon,
  TeamIcon,
} from "@/lib/icons";

export const metadata = { title: "ภาพรวม" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const pctText = (part: number, whole: number) => {
  const p = pct(part, whole);
  return p === null ? "-" : `${p}%`;
};

export default async function OverviewPage({ searchParams }: Props) {
  const me = await requireMe(["executive", "admin"]);
  const scope = await getScope(me.role);
  const f = readFilters({
    project: scope.current?.id,
    ...(await searchParams),
  });
  const d = await loadDashboard(f);
  const keep = toQuery({ project: f.project, from: f.from, to: f.to });
  const pics = await loadAvatars((d?.by_sales ?? []).map((s) => s.owner_id));

  return (
    <>
      <PageTitle
        title="ภาพรวมยอดขาย"
        sub={`${scope.current?.name ?? "ทุกโครงการ"} · ${thDate(f.from)} ถึง ${thDate(f.to)}`}
        action={<FilterBar inline path="/overview" values={f} />}
      />
      {(me.role === "executive" || me.role === "admin") && (
        <LinkTiles
          tiles={[
            {
              href: "/projects",
              title: "โครงการ",
              sub: "เทียบโครงการ · ผังแปลง",
              icon: MENU_ICON.building,
              tone: "brand",
            },
          ]}
        />
      )}

      {!d ? (
        <Notice tone="danger">โหลดตัวเลขไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง</Notice>
      ) : Object.values(d.current ?? {}).reduce((a, b) => a + Number(b), 0) ===
        0 ? (
        <EmptyState
          icon={NoDataIcon}
          tone="info"
          title="ยังไม่มีลีดในระบบ"
          hint="เมื่อเซลส์เพิ่มลีดหรือมีลีดจากโฆษณาเข้ามา ตัวเลขจะขึ้นที่หน้านี้"
        />
      ) : (
        <Content d={d} keep={keep} pics={pics} />
      )}
    </>
  );
}

function Content({
  d,
  keep,
  pics,
}: {
  d: NonNullable<Awaited<ReturnType<typeof loadDashboard>>>;
  keep: string;
  pics: Record<string, string>;
}) {
  const funnel = d.funnel ?? [];
  const lostMax = Math.max(...d.lost_reasons.map((x) => x.count), 0);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          icon={NewLeadIcon}
          color="new"
          label="ลีดใหม่"
          value={d.kpi.new_leads}
          note="เข้ามาในช่วงนี้"
        />
        <Kpi
          icon={AppointmentIcon}
          color="appointment"
          label="นัดชม"
          value={d.kpi.appointments}
          note="นัดในช่วงนี้"
        />
        <Kpi
          icon={ReservedIcon}
          color="reserved"
          label="จอง"
          value={d.kpi.reservations}
          note="จองในช่วงนี้"
        />
        <Kpi
          icon={TransferIcon}
          color="transferred"
          label="โอน"
          value={d.kpi.transfers}
          note="โอนในช่วงนี้"
        />
      </div>
      <Kpi
        label="งานตามที่เลยกำหนดทั้งทีม"
        value={d.kpi.overdue}
        tone={d.kpi.overdue > 0 ? "danger" : "neutral"}
        note={
          d.kpi.overdue > 0
            ? `เลยกำหนด ${num(d.kpi.overdue)} ราย ณ วันนี้ · กดดูรายชื่อ`
            : "ไม่มีงานค้าง ณ วันนี้"
        }
        href="/leads?overdue=1"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Section
          icon={FunnelIcon}
          tone="brand"
          title="Funnel"
          sub="ลีดที่เข้ามาในช่วงวันที่เลือก เคยไปถึงขั้นไหน (คนที่จองแล้วถูกนับทุกขั้นที่ผ่านมา) และหลุดไปกี่คน"
        >
          <FunnelChart
            steps={funnel.map((x) => ({
              key: x.stage,
              label: stageOf(x.stage).label,
              count: x.count,
            }))}
            dropped={
              d.dropped
                ? [
                    {
                      key: "lost",
                      label: stageOf("lost").label,
                      count: d.dropped.lost,
                    },
                    {
                      key: "unqualified",
                      label: stageOf("unqualified").label,
                      count: d.dropped.unqualified,
                    },
                  ]
                : undefined
            }
          />
        </Section>
        <Section
          icon={TeamIcon}
          tone="info"
          title="ลูกค้าในมือตอนนี้"
          sub="ลูกค้าทุกคนที่ยังคุยอยู่ ไม่ว่าเข้ามาเมื่อไร ตอนนี้อยู่ขั้นไหน (นับคนละครั้ง)"
        >
          <PipelineBar
            parts={STAGES.filter((s) => s.open).map((s) => ({
              key: s.key,
              label: s.label,
              count: Number(d.current?.[s.key] ?? 0),
            }))}
          />
        </Section>
      </div>

      <Section
        icon={ProjectIcon}
        tone="info"
        title="รายโครงการ"
        sub="กดที่โครงการเพื่อดูรายละเอียดและผังแปลง"
      >
        {d.by_project.length === 0 ? (
          <p className="text-sm text-ink-soft">ยังไม่มีโครงการ</p>
        ) : (
          <StatTable
            titleLabel="โครงการ"
            storageKey="salesdesk.overview.projects"
            columns={[
              { label: "ลีด" },
              { label: "นัดชม" },
              { label: "จอง" },
              { label: "โอน" },
              { label: "ขายแล้ว" },
              { label: "แปลงว่าง" },
              { label: "มูลค่าคงเหลือ" },
            ]}
            rows={d.by_project.map((p) => ({
              key: p.id,
              title: p.name,
              sortTitle: p.name,
              href: `/projects/${p.id}`,
              linkLabel: "ดูโครงการ",
              cells: [
                num(p.leads),
                num(p.appointments),
                num(p.reservations),
                num(p.transfers),
                baht(p.sold_value),
                `${num(p.units_left)} แปลง`,
                baht(p.value_left),
              ],
            }))}
          />
        )}
      </Section>

      <Section
        icon={CampaignIcon}
        tone="purple"
        title="รายแคมเปญ"
        sub="ลีดที่เข้ามาในช่วงนี้ แยกตามแคมเปญ"
      >
        {d.by_campaign.length === 0 ? (
          <p className="text-sm text-ink-soft">ยังไม่มีลีดในช่วงนี้</p>
        ) : (
          <StatTable
            titleLabel="แคมเปญ"
            storageKey="salesdesk.overview.campaigns"
            columns={[
              { label: "ลีด" },
              { label: "ลีดคุณภาพ" },
              { label: "มาชม" },
              { label: "จอง" },
            ]}
            rows={d.by_campaign.map((c) => ({
              key: c.name,
              title: c.name,
              sortTitle: c.name,
              cells: [
                num(c.leads),
                `${num(c.qualified)} (${pctText(c.qualified, c.leads)})`,
                `${num(c.visited)} (${pctText(c.visited, c.leads)})`,
                `${num(c.reserved)} (${pctText(c.reserved, c.leads)})`,
              ],
            }))}
          />
        )}
      </Section>

      <Section
        icon={LostReasonIcon}
        tone="danger"
        title="เหตุผลที่ไม่ซื้อ"
        sub="เรียงจากมากไปน้อย"
      >
        {d.lost_reasons.length === 0 ? (
          <p className="text-sm text-ink-soft">ยังไม่มีลูกค้าที่ไม่ซื้อในช่วงนี้</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {d.lost_reasons.map((r) => (
              <Bar
                key={r.label}
                label={r.label}
                value={r.count}
                max={lostMax}
                tone="danger"
                note="ราย"
              />
            ))}
          </ul>
        )}
      </Section>

      <Section
        icon={TeamIcon}
        tone="ok"
        title="ทีมขาย"
        sub="สรุปสั้นรายเซลส์"
        action={
          <Link
            href={`/team${keep}`}
            className="inline-flex min-h-11 items-center text-sm text-brand"
          >
            ดูทั้งหมด ›
          </Link>
        }
      >
        {d.by_sales.length === 0 ? (
          <p className="text-sm text-ink-soft">ยังไม่มีเซลส์ในระบบ</p>
        ) : (
          <StatTable
            titleLabel="เซลส์"
            columns={[
              { label: "ลีดที่ถือ" },
              { label: "กิจกรรม/สัปดาห์" },
              { label: "เลยกำหนด" },
              { label: "นัดชม" },
              { label: "จอง" },
            ]}
            rows={d.by_sales.map((s) => ({
              key: s.owner_id,
              sortTitle: s.owner_name || "-",
              title: (
                <AvatarName name={s.owner_name || "-"} url={pics[s.owner_id]} />
              ),
              href: `/team${keep}`,
              linkLabel: "ทีมขาย",
              cells: [
                num(s.leads_open),
                num(s.activities_per_week),
                s.overdue > 0 ? `เลย ${num(s.overdue)}` : "0",
                num(s.appointments),
                num(s.reservations),
              ],
            }))}
          />
        )}
      </Section>
    </>
  );
}
