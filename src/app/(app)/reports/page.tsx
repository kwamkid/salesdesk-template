import type { ReactNode } from "react";
import { Section } from "@/components/reports/charts";
import { CopyBox } from "@/components/reports/copy-box";
import { loadDashboard, loadProjects, loadSales } from "@/components/reports/data";
import { FilterBar } from "@/components/reports/filter-bar";
import { META_GROUPS, readFilters } from "@/components/reports/params";
import { claudeSummary, teamPackPrompt } from "@/components/reports/summary";
import { buttonClass } from "@/components/ui/button";
import { Notice, PageTitle } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";
import { requireMe } from "@/lib/auth";
import { thDate } from "@/lib/format";
import { ClaudeIcon, ExportFileIcon, TeamPackIcon } from "@/lib/icons";

export const metadata = { title: "รายงาน" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const FORM = "report-filters";

/** Submits the filter form to the export route; the browser downloads the file and stays here. */
function Download({ kind, label = "ดาวน์โหลด CSV" }: { kind: string; label?: string }) {
  return (
    <button type="submit" form={FORM} formMethod="get" formAction={`/api/export/${kind}`} className={buttonClass("primary")}>
      {label}
    </button>
  );
}

function FileCard({ title, purpose, uses, children }: { title: string; purpose: string; uses: string; children: ReactNode }) {
  return (
    <li className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm">{purpose}</p>
        <p className="text-xs text-ink-soft">ใช้ตัวกรอง: {uses}</p>
      </div>
      {children}
    </li>
  );
}

export default async function ReportsPage({ searchParams }: Props) {
  const me = await requireMe();
  const boss = me.role === "admin" || me.role === "executive";
  const q = await searchParams;
  const f = readFilters(q);
  const group = typeof q.group === "string" && Object.hasOwn(META_GROUPS, q.group) ? q.group : "unqualified";

  const [projects, sales, d] = await Promise.all([
    loadProjects(),
    boss ? loadSales() : Promise.resolve(undefined),
    boss ? loadDashboard(f) : Promise.resolve(null),
  ]);
  const projectName = projects.find((p) => p.id === f.project)?.name ?? "ทุกโครงการ";
  const rangeText = `${thDate(f.from)} ถึง ${thDate(f.to)}`;

  return (
    <>
      <PageTitle
        title="รายงาน"
        sub={boss ? "เลือกตัวกรองแล้วกดดาวน์โหลด ไฟล์เปิดใน Excel ได้ภาษาไทย" : "ไฟล์มีเฉพาะลูกค้าและงานของคุณ"}
      />
      <FilterBar id={FORM} path="/reports" values={{ ...f, owner: boss ? f.owner : null }} projects={projects} sales={sales} showStage />
      <p className="text-sm text-ink-soft">
        ปุ่มดาวน์โหลดใช้ค่าในช่องกรองตอนที่กด ไม่ต้องกด &quot;ใช้ตัวกรอง&quot; ก่อน
        {boss && " (ข้อความสรุปสำหรับ Claude ด้านล่างเปลี่ยนตามเมื่อกด \"ใช้ตัวกรอง\")"}
      </p>

      <Section icon={ExportFileIcon} tone="ok" title="ไฟล์ข้อมูล" sub="ดาวน์โหลดเป็น CSV เปิดใน Excel ได้">
        <ul className="grid gap-3 md:grid-cols-2">
          <FileCard title="ลูกค้าทั้งหมด" purpose="1 แถวต่อลูกค้า ใช้ประชุมทีม ส่งผู้บริหาร" uses="โครงการ เซลส์ ขั้น ช่วงวันที่ได้ลีด">
            <Download kind="leads" />
          </FileCard>
          <FileCard title="กิจกรรมทั้งหมด" purpose="1 แถวต่อกิจกรรม ใช้ตรวจการทำงานย้อนหลัง" uses="โครงการ เซลส์ ช่วงวันที่ทำกิจกรรม">
            <Download kind="activities" />
          </FileCard>
          <FileCard title="งานตามที่ค้าง" purpose="ลูกค้าที่ถึงหรือเลยกำหนดตาม แยกรายเซลส์ ใช้ไล่งาน" uses="โครงการ เซลส์ (ณ วันนี้ ไม่ใช้ช่วงวันที่)">
            <Download kind="overdue" />
          </FileCard>
          {boss && (
            <FileCard
              title="รายชื่อสำหรับ Meta"
              purpose="มีแค่เบอร์และอีเมล ส่งให้ Claude + Meta MCP สร้าง custom audience ได้ทันที"
              uses="โครงการ และกลุ่มที่เลือก"
            >
              <Field label="กลุ่มรายชื่อ">
                <Select form={FORM} name="group" defaultValue={group}>
                  {Object.entries(META_GROUPS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Download kind="meta" />
            </FileCard>
          )}
        </ul>
      </Section>

      {boss && (
        <>
          <Section icon={ClaudeIcon} tone="purple" title="สรุปสำหรับ Claude" sub={`${projectName} · ${rangeText} · ก๊อปไปให้ Claude วิเคราะห์คู่กับข้อมูลโฆษณา`}>
            {d ? (
              <CopyBox label="ตัวเลข funnel และรายแคมเปญ" text={claudeSummary(d, projectName)} rows={10} />
            ) : (
              <Notice tone="danger">โหลดตัวเลขไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง</Notice>
            )}
          </Section>

          <Section
            icon={TeamPackIcon}
            tone="info"
            title="ชุดวิเคราะห์ทีมขายสำหรับ Claude"
            sub="ดาวน์โหลด 2 ไฟล์ แล้วแนบให้ Claude พร้อมคำสั่งด้านล่าง ลูกค้าแสดงเป็นรหัส ไม่มีชื่อ เบอร์ หรืออีเมล"
          >
            <p className="text-xs text-ink-soft">ใช้ตัวกรอง: โครงการ ช่วงวันที่ (ทั้งทีม ไม่แยกเซลส์)</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Download kind="team-activities" label="1. ไฟล์กิจกรรมพร้อมโน้ต" />
              <Download kind="team-summary" label="2. ไฟล์สรุปรายเซลส์" />
            </div>
            <CopyBox label="คำสั่งสำหรับวางใน Claude" text={teamPackPrompt(rangeText)} rows={10} />
            <Notice tone="warn">
              ตัวเลขบอกปริมาณงานและผลลัพธ์ แต่เซลส์ที่ถือโครงการขายยากหรือได้ลีดคุณภาพต่ำจะดูแย่กว่าความจริง
              ผลวิเคราะห์ใช้ประกอบการคุยกับทีม ไม่ใช้ตัดสินแทน
            </Notice>
          </Section>
        </>
      )}
    </>
  );
}
