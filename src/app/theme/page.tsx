import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, Loading, Notice, PageTitle, StageBadge } from "@/components/ui/card";
import { DateField, DateRangeFields } from "@/components/ui/date-range-picker";
import { Field, Input, Select } from "@/components/ui/field";
import { todayISO } from "@/lib/format";
import { APP } from "@/config/app";
import { STAGES } from "@/config/stages";
import { ThemeDemos } from "./demos";

export const metadata = { title: "ธีม" };

const COLORS = [
  ["brand", "bg-brand", "ปุ่มหลัก เมนูที่เลือกอยู่"],
  ["ink", "bg-ink", "ตัวหนังสือหลัก"],
  ["ink-soft", "bg-ink-soft", "ตัวหนังสือรอง"],
  ["surface", "bg-surface", "พื้นการ์ด"],
  ["bg", "bg-bg", "พื้นหลังแอป"],
  ["line", "bg-line", "เส้นคั่น ขอบการ์ด"],
  ["line-strong", "bg-line-strong", "ขอบช่องกรอก ขอบปุ่มรอง"],
  ["sidebar", "bg-sidebar", "พื้นเมนูซ้าย"],
  ["sidebar-active", "bg-sidebar-active", "แถวเมนูที่เลือกอยู่"],
  ["header", "bg-header", "แถบบน แถบเมนูล่าง"],
  ["ok", "bg-ok", "สำเร็จ"],
  ["warn", "bg-warn", "ต้องตามวันนี้"],
  ["danger", "bg-danger", "เลยกำหนด ลบ"],
] as const;

/** One page that shows every theme value and shared component.
 *  After editing globals.css or the logo, open this page to see the result. */
export default function ThemePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 py-8">
      <div className="flex items-center gap-3">
        <Image src={APP.logo} alt={`โลโก้ ${APP.name}`} width={44} height={44} />
        <PageTitle title={APP.name} sub="ตัวอย่างธีม แก้สีและฟอนต์ที่ src/app/globals.css" />
      </div>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">สี</h2>
        <ul className="grid grid-cols-3 gap-2">
          {COLORS.map(([name, cls, use]) => (
            <li key={name} className="flex flex-col gap-1">
              <span className={`h-11 rounded-control border border-line ${cls}`} />
              <span className="text-xs font-medium">{name}</span>
              <span className="text-xs text-ink-soft">{use}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">ขนาดตัวหนังสือ</h2>
        <p className="text-2xl font-semibold">28 ตัวเลขสำคัญ 1,250,000</p>
        <p className="text-xl font-semibold">22 หัวข้อหน้า</p>
        <p className="text-lg font-semibold">18 หัวข้อการ์ด</p>
        <p className="text-base">16 ข้อความทั่วไป และช่องกรอกทุกช่อง</p>
        <p className="text-sm text-ink-soft">14 ข้อความรอง</p>
        <p className="text-xs text-ink-soft">12 ป้ายกำกับ เวลา</p>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">ปุ่ม</h2>
        <Button full>บันทึก</Button>
        <Button full variant="secondary">
          ยกเลิก
        </Button>
        <Button full variant="danger">
          ปิดสิทธิ์ผู้ใช้
        </Button>
        <Button full disabled>
          อนุมัติ (ยังกดไม่ได้)
        </Button>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">ช่องกรอก</h2>
        <Field label="ชื่อลูกค้า" required>
          <Input placeholder="คุณสมชาย ใจดี" />
        </Field>
        <Field label="เบอร์โทร" required error="เบอร์นี้มีในระบบแล้ว เป็นลูกค้าของ สมหญิง">
          <Input inputMode="tel" defaultValue="0812345678" />
        </Field>
        <Field label="โครงการ" hint="เลือกได้เฉพาะโครงการที่ดูแล">
          <Select defaultValue="">
            <option value="">เลือกโครงการ</option>
            <option>บ้านสวนริมธาร</option>
          </Select>
        </Field>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">เลือกวันที่</h2>
        <Field label="ช่วงวันที่" hint="มีช่วงด่วน วันนี้ เมื่อวาน 7 วันล่าสุด เดือนนี้ ฯลฯ">
          <DateRangeFields />
        </Field>
        <Field label="ตามครั้งถัดไป" hint="วันเดียว เลือกวันที่ผ่านมาแล้วไม่ได้">
          <DateField name="next_follow_up" minDate={todayISO()} />
        </Field>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">ป้ายขั้นของลูกค้า</h2>
        <div className="flex flex-wrap gap-2">
          {STAGES.map((s) => (
            <StageBadge key={s.key} stage={s.key} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="danger">เลย 3 วัน</Badge>
          <Badge tone="warn">ตามวันนี้</Badge>
          <Badge tone="ok">ส่ง Meta สำเร็จ</Badge>
        </div>
      </Card>

      <ThemeDemos />

      <Notice tone="ok">บันทึกแล้ว</Notice>
      <Notice tone="warn">ต้องใส่วันตามครั้งถัดไป</Notice>
      <Notice tone="danger">บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง</Notice>

      <EmptyState title="ยังไม่มีงานวันนี้" hint="ลีดใหม่และงานตามจะขึ้นที่นี่" />
      <Loading />
    </main>
  );
}
