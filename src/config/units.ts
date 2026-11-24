// Plot statuses. The keys are stored in the database, so do not rename them.
import type { StageTone } from "./stages";

export type UnitStatus = "available" | "interested" | "reserved" | "contracted" | "transferred";

export const UNIT_STATUS: { key: UnitStatus; label: string; tone: StageTone }[] = [
  { key: "available", label: "ว่าง", tone: "neutral" },
  { key: "interested", label: "มีคนสนใจ", tone: "warn" },
  { key: "reserved", label: "จอง", tone: "brand" },
  { key: "contracted", label: "ทำสัญญา", tone: "ok" },
  { key: "transferred", label: "โอน", tone: "ok" },
];

export const unitStatusOf = (key: string) => UNIT_STATUS.find((s) => s.key === key) ?? UNIT_STATUS[0];

/** Columns of 13-Unit_Import_Template.xlsx (row 1) -> key the import_units() function expects. */
export const UNIT_IMPORT_COLUMNS: { header: string; key: string; required?: boolean }[] = [
  { header: "เลขแปลง", key: "code", required: true },
  { header: "โซน/เฟส", key: "zone" },
  { header: "แบบบ้าน", key: "house_type" },
  { header: "ที่ดิน (ตร.ว.)", key: "land_sqw" },
  { header: "พื้นที่ใช้สอย (ตร.ม.)", key: "usable_sqm" },
  { header: "ราคา (บาท)", key: "price" },
  { header: "สถานะ", key: "status" },
  { header: "หมายเหตุ", key: "note" },
];
