// Building blocks shared by the document templates. Screen styles use theme classes;
// the print look (A4, black on white) comes from the print stylesheet on the documents page.

import type { ReactNode } from "react";
import type { DocField } from "./types";

/** Fields every sample document uses. Each template adds its own manual fields after these. */
export const COMMON_FIELDS: DocField[] = [
  { key: "company_name", label: "ชื่อบริษัท", source: "company.name", required: true },
  { key: "company_address", label: "ที่อยู่บริษัท", source: "company.address" },
  { key: "company_phone", label: "โทรศัพท์บริษัท", source: "company.phone" },
  { key: "company_tax_id", label: "เลขประจำตัวผู้เสียภาษีบริษัท", source: "company.tax_id" },
  { key: "doc_date", label: "วันที่เอกสาร", source: "today", required: true },
  { key: "customer_name", label: "ชื่อลูกค้า", source: "lead.full_name", required: true },
  { key: "customer_phone", label: "เบอร์โทรลูกค้า", source: "lead.phone", required: true },
  { key: "customer_address", label: "ที่อยู่ลูกค้า", source: "lead.address" },
  { key: "project_name", label: "โครงการ", source: "project.name", required: true },
  { key: "plot_code", label: "แปลงเลขที่", source: "unit.code", required: true },
  { key: "zone", label: "โซน", source: "unit.zone" },
  { key: "house_type", label: "แบบบ้าน", source: "unit.house_type" },
  { key: "land_sqw", label: "ที่ดิน (ตารางวา)", source: "unit.land_sqw" },
  { key: "usable_sqm", label: "พื้นที่ใช้สอย (ตารางเมตร)", source: "unit.usable_sqm" },
  { key: "price", label: "ราคาขาย (บาท)", source: "unit.price", required: true },
  { key: "sales_name", label: "ชื่อพนักงานขาย", source: "sales.name", required: true },
];

const MIN_WIDTH = { sm: "min-w-24", md: "min-w-32", lg: "min-w-48", xl: "min-w-64" } as const;

/** A filled blank. Empty blanks get a warning background on screen and a dotted line on paper. */
export function Slot({ v, k, w = "md" }: { v: Record<string, string>; k: string; w?: keyof typeof MIN_WIDTH }) {
  const value = v[k]?.trim();
  return value ? (
    <span className="font-medium">{value}</span>
  ) : (
    <span
      className={`doc-empty inline-block border-b border-dotted border-ink-soft bg-warn-soft align-bottom ${MIN_WIDTH[w]}`}
      aria-label="ยังไม่ได้กรอก"
    >
      {" "}
    </span>
  );
}

/** Company letterhead with the document title, number and date. */
export function DocHead({ v, title }: { v: Record<string, string>; title: string }) {
  return (
    <div className="flex flex-col gap-3 border-b border-ink pb-3">
      <div className="flex flex-col gap-1 text-center">
        <p className="text-lg font-semibold">
          <Slot v={v} k="company_name" w="lg" />
        </p>
        <p className="text-sm">
          <Slot v={v} k="company_address" w="xl" />
        </p>
        <p className="text-sm">
          โทร <Slot v={v} k="company_phone" /> · เลขประจำตัวผู้เสียภาษี <Slot v={v} k="company_tax_id" />
        </p>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="text-right text-sm">
          <p>
            เลขที่ <span className="font-medium">{v.doc_no || "ออกเลขเมื่อกดพิมพ์"}</span>
          </p>
          <p>
            วันที่ <Slot v={v} k="doc_date" />
          </p>
        </div>
      </div>
    </div>
  );
}

/** "label value" line used for customer and plot details. */
export function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p className="flex flex-wrap gap-x-2">
      <span className="text-ink-soft">{label}</span>
      <span>{children}</span>
    </p>
  );
}

/** Signature block: line, name in brackets, role. */
export function Signature({ name, role }: { name?: string; role: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-sm">
      <span className="mt-10 block w-48 border-b border-ink" aria-hidden />
      <span>({name ? ` ${name} ` : " ".repeat(40)})</span>
      <span>{role}</span>
    </div>
  );
}
