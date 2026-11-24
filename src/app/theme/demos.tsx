"use client";

// Live examples of the shared parts for /theme. Each card = one part from src/components/ui/.
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { ConfirmCard, Sheet } from "@/components/ui/confirm-card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { FormSelect } from "@/components/ui/form-select";
import { MultiSelectSearch } from "@/components/ui/multi-select-search";
import { ActionMenu } from "@/components/ui/action-menu";
import { Toggle, ToggleRow } from "@/components/ui/toggle";
import { SearchInput } from "@/components/ui/search-input";
import { StatusTabs } from "@/components/ui/status-tabs";
import { Tooltip } from "@/components/ui/tooltip";
import { Popover } from "@/components/ui/popover";
import { HelpHint } from "@/components/ui/help-hint";
import { Checkbox, Radio } from "@/components/ui/checkbox";
import { PageSkeleton } from "@/components/ui/skeleton";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { CopyField } from "@/components/ui/copy-field";
import { StickyActionBar } from "@/components/ui/sticky-action-bar";
import { TimePicker } from "@/components/ui/time-picker";
import { DateField } from "@/components/ui/date-range-picker";
import { ThaiAddressInput } from "@/components/ui/thai-address-input";
import type { ThaiAddressParts } from "@/lib/thai-address";
import { Stepper, SetupSteps, SetupStep } from "@/components/ui/stepper";
import { ChipsInput } from "@/components/ui/chips-input";
import { Avatar } from "@/components/ui/avatar";
import { StageBadge } from "@/components/ui/card";
import { DeleteIcon, EditIcon } from "@/lib/icons";
import { STAGES } from "@/config/stages";

function Demo({ title, file, children }: { title: string; file: string; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="font-mono text-xs text-ink-soft">src/components/ui/{file}</p>
      </div>
      {children}
    </Card>
  );
}

type Row = { id: string; name: string; stage: string; owner: string; value: number };
const ROWS: Row[] = [
  { id: "1", name: "คุณสมชาย ใจดี", stage: "qualified", owner: "สมหญิง", value: 3500000 },
  { id: "2", name: "คุณมานี รักบ้าน", stage: "appointment", owner: "สมศักดิ์", value: 4200000 },
  { id: "3", name: "คุณปิติ มีสุข", stage: "reserved", owner: "สมหญิง", value: 2900000 },
];
const COLUMNS: DataTableColumn<Row>[] = [
  { key: "name", header: "ลูกค้า", sortable: true },
  { key: "stage", header: "ขั้น", render: (r) => <StageBadge stage={r.stage} />, sortable: true },
  { key: "owner", header: "เซลส์", sortable: true },
  { key: "value", header: "งบ", align: "right", sortable: true, render: (r) => r.value.toLocaleString("th-TH") },
];

const PHOTOS = [
  { src: "/samples/visits/visit-1.jpg", caption: "มาชมโครงการ · 12 พ.ย. 2569" },
  { src: "/samples/visits/visit-2.jpg", caption: "ดูบ้านตัวอย่าง · 14 พ.ย. 2569" },
  { src: "/samples/visits/visit-3.jpg", caption: "ดูแปลง A7 · 18 พ.ย. 2569" },
];

const PROJECTS = [
  { id: "p1", label: "บ้านสวนริมธาร" },
  { id: "p2", label: "เดอะวิลล์ บางนา" },
  { id: "p3", label: "ลานนา เรสซิเดนซ์" },
];

export function ThemeDemos() {
  const [modal, setModal] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [photo, setPhoto] = useState<number | null>(null);
  const [tab, setTab] = useState("all");
  const [project, setProject] = useState("");
  const [projects, setProjects] = useState<string[]>(["p1"]);
  const [on, setOn] = useState(true);
  const [q, setQ] = useState("");
  const [time, setTime] = useState("10:30");
  const [pop, setPop] = useState(false);
  const popRef = useRef<HTMLButtonElement>(null);
  const [address, setAddress] = useState<ThaiAddressParts>({ district: "", amphoe: "", province: "", postalCode: "" });
  const [chips, setChips] = useState<string[]>(["ใกล้รถไฟฟ้า", "มีสระว่ายน้ำ"]);

  return (
    <>
      <Demo title="Modal · Sheet · ConfirmCard" file="modal.tsx · confirm-card.tsx">
        <p className="text-sm text-ink-soft">
          Esc หรือแตะพื้นมืดเพื่อปิด · มือถือขึ้นจากด้านล่าง · ปฏิทินและรายการเลือกเปิดทับได้
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setModal(true)}>
            เปิด Modal
          </Button>
          <Button variant="secondary" onClick={() => setSheet(true)}>
            เปิด Sheet
          </Button>
          <Button variant="danger" onClick={() => setConfirm(true)}>
            ปิดสิทธิ์ผู้ใช้
          </Button>
        </div>
        <Modal
          open={modal}
          onClose={() => setModal(false)}
          title="แก้ไขข้อมูลลูกค้า"
          size="lg"
          footer={
            <ModalFooter>
              <Button variant="secondary" onClick={() => setModal(false)}>
                ยกเลิก
              </Button>
              <Button onClick={() => setModal(false)}>บันทึก</Button>
            </ModalFooter>
          }
        >
          <div className="flex flex-col gap-4">
            <Field label="โครงการ">
              <FormSelect options={PROJECTS} value={project} onChange={setProject} placeholder="เลือกโครงการ" />
            </Field>
            <Field label="ตามครั้งถัดไป">
              <DateField name="demo_date" />
            </Field>
          </div>
        </Modal>
        <Sheet open={sheet} onClose={() => setSheet(false)} title="บันทึกการติดตาม">
          <p className="text-ink-soft">เนื้อหาของ Sheet อยู่ตรงนี้ ปุ่มบันทึกอยู่ในฟอร์มของหน้าเอง</p>
        </Sheet>
        <ConfirmCard
          open={confirm}
          onClose={() => setConfirm(false)}
          onConfirm={() => setConfirm(false)}
          title="ปิดสิทธิ์ผู้ใช้"
          rows={[
            { label: "ผู้ใช้", value: "สมศักดิ์ ขายเก่ง" },
            { label: "ลีดที่ดูแล", value: "12 ราย" },
          ]}
          consequence="ผู้ใช้นี้จะเข้าระบบไม่ได้จนกว่าแอดมินจะเปิดสิทธิ์อีกครั้ง"
          confirmLabel="ยืนยันปิดสิทธิ์ สมศักดิ์"
          danger
        />
      </Demo>

      <Demo title="StatusTabs — แท็บกรอง" file="status-tabs.tsx">
        <StatusTabs
          activeKey={tab}
          onSelect={setTab}
          tabs={[
            { key: "all", label: "ทั้งหมด", count: 48 },
            ...STAGES.slice(0, 6).map((s, i) => ({ key: s.key, label: s.label, tone: s.tone, count: 12 - i })),
            { key: "overdue", label: "เลยกำหนด", tone: "danger" as const, count: 6, tooltip: "ลีดที่เลยวันนัดตามแล้ว" },
          ]}
        />
      </Demo>

      <Demo title="DataTable — ตาราง (มือถือเป็นการ์ด)" file="data-table.tsx">
        <DataTable columns={COLUMNS} data={ROWS} rowKey="id" breakpoint="md" storageKey="theme-demo" caption="ตัวอย่างตาราง" />
      </Demo>

      <Demo title="ImageLightbox — ดูรูป" file="image-lightbox.tsx">
        <div className="flex gap-2">
          {PHOTOS.map((p, i) => (
            <button
              key={p.src}
              type="button"
              onClick={() => setPhoto(i)}
              aria-label={`ดูรูป ${p.caption}`}
              className="overflow-hidden rounded-control border border-line"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt="" className="h-20 w-24 object-cover" />
            </button>
          ))}
        </div>
        <ImageLightbox images={photo === null ? null : PHOTOS} initialIndex={photo ?? 0} onClose={() => setPhoto(null)} />
      </Demo>

      <Demo title="FileDropzone — แนบไฟล์" file="file-dropzone.tsx">
        <FileDropzone name="demo_file" accept="image/*" maxSizeMB={10} hint="JPG หรือ PNG ไม่เกิน 10 MB" />
      </Demo>

      <Demo title="FormSelect · MultiSelectSearch — รายการเลือก" file="form-select.tsx · multi-select-search.tsx">
        <Field label="โครงการ">
          <FormSelect options={PROJECTS} value={project} onChange={setProject} clearLabel="ทุกโครงการ" />
        </Field>
        <Field label="ขั้น (ยาวกว่า 7 รายการมีช่องค้นหา)">
          <FormSelect options={STAGES.map((s) => ({ id: s.key, label: s.label }))} defaultValue="new" />
        </Field>
        <Field label="โครงการที่ดูแล (เลือกได้หลายโครงการ)">
          <MultiSelectSearch options={PROJECTS} value={projects} onChange={setProjects} placeholder="เลือกโครงการ" />
        </Field>
      </Demo>

      <Demo title="TimePicker — เลือกเวลา" file="time-picker.tsx">
        <Field label="เวลานัด">
          <TimePicker value={time} onChange={setTime} minuteStep={30} minHour={7} maxHour={21} />
        </Field>
      </Demo>

      <Demo title="ActionMenu · Tooltip · Popover · HelpHint" file="action-menu.tsx · tooltip.tsx · popover.tsx · help-hint.tsx">
        <div className="flex flex-wrap items-center gap-3">
          <ActionMenu
            label="ตัวเลือกของ คุณสมชาย"
            items={[
              { key: "edit", label: "แก้ไข", icon: <EditIcon aria-hidden />, onClick: () => {} },
              { key: "del", label: "ลบ", icon: <DeleteIcon aria-hidden />, danger: true, dividerBefore: true, onClick: () => {} },
            ]}
          />
          <Tooltip text="แก้ไขลูกค้า">
            <button
              type="button"
              aria-label="แก้ไขลูกค้า"
              className="inline-flex h-11 w-11 items-center justify-center rounded-control text-ink-soft hover:bg-sidebar-hover hover:text-ink"
            >
              <EditIcon className="h-5 w-5" aria-hidden />
            </button>
          </Tooltip>
          <button
            ref={popRef}
            type="button"
            onClick={() => setPop((o) => !o)}
            className="inline-flex min-h-11 items-center rounded-full bg-danger-soft px-3 text-sm font-medium text-danger"
          >
            เลย 3 วัน
          </button>
          <Popover open={pop} onClose={() => setPop(false)} anchorRef={popRef} width={220}>
            <p className="text-sm">ต้องตามตั้งแต่ 20 พ.ย. 2569</p>
          </Popover>
          <span className="inline-flex items-center">
            ลีดคุณภาพ
            <HelpHint>ลูกค้ามีงบ และสนใจโครงการจริง พร้อมนัดชม</HelpHint>
          </span>
          <Avatar name="สมหญิง ขายดี" details={{ role: "เซลส์", phone: "0812345678", email: "somying@example.com" }} />
        </div>
      </Demo>

      <Demo title="SearchInput · Toggle · Checkbox · Radio" file="search-input.tsx · toggle.tsx · checkbox.tsx">
        <SearchInput value={q} onChange={setQ} placeholder="ค้นหาชื่อหรือเบอร์โทร" />
        <div className="flex items-center gap-2">
          <Toggle checked={on} onChange={setOn} aria-label="เปิดใช้" />
          <span>{on ? "เปิดอยู่" : "ปิดอยู่"}</span>
        </div>
        <ToggleRow title="แจ้งเตือนลีดใหม่" hint="ส่งเข้ามือถือทันทีที่มีลีดเข้า" defaultChecked />
        <Checkbox defaultChecked hint="เห็นลีดของทุกคนในโครงการ">บ้านสวนริมธาร</Checkbox>
        <div className="flex gap-4">
          <Radio name="demo_radio" defaultChecked>
            ทุกโครงการ
          </Radio>
          <Radio name="demo_radio">เลือกเอง</Radio>
        </div>
      </Demo>

      <Demo title="ChipsInput — ป้ายคำ" file="chips-input.tsx">
        <ChipsInput value={chips} onChange={setChips} suggestions={["ใกล้โรงเรียน", "ใกล้รถไฟฟ้า", "มีสระว่ายน้ำ", "สัตว์เลี้ยงได้"]} />
      </Demo>

      <Demo title="ThaiAddressInput — ที่อยู่ไทย" file="thai-address-input.tsx">
        <ThaiAddressInput value={address} onChange={(p) => setAddress((a) => ({ ...a, ...p }))} />
      </Demo>

      <Demo title="Stepper · SetupSteps — ขั้นตอน" file="stepper.tsx">
        <Stepper
          steps={[
            { key: "1", label: "ลีดเข้า", state: "done" },
            { key: "2", label: "นัดชม", state: "current" },
            { key: "3", label: "จอง", state: "todo" },
          ]}
        />
        <SetupSteps>
          <SetupStep n={1} title="เชื่อม Supabase" done />
          <SetupStep n={2} title="ตั้งค่า Google login" done={false} current>
            <p className="text-sm text-ink-soft">ทำตามคู่มือ docs/guides แล้วกลับมาที่หน้านี้</p>
          </SetupStep>
        </SetupSteps>
      </Demo>

      <Demo title="CollapsibleCard · CopyField" file="collapsible-card.tsx · copy-field.tsx">
        <CollapsibleCard title="7 วันข้างหน้า" summary="12 ราย">
          <p className="text-ink-soft">รายการลีดที่ต้องตามในสัปดาห์นี้</p>
        </CollapsibleCard>
        <CopyField label="ลิงก์เชิญ" value="https://salesdesk.example.com/invite/abc123" hint="ส่งให้คนที่จะเข้าใช้" />
      </Demo>

      <Demo title="Skeleton · StickyActionBar" file="skeleton.tsx · sticky-action-bar.tsx">
        <PageSkeleton tabs rows={2} />
        <StickyActionBar hint="ยังไม่ได้บันทึก" secondary={<Button variant="secondary">ยกเลิก</Button>} primary={<Button>บันทึก</Button>} />
      </Demo>
    </>
  );
}
