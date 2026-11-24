import { EmptyState } from "@/components/ui/card";
import { NotBuiltIcon } from "@/lib/icons";

/** What the student types in plain words; CLAUDE.md maps it to the docs/steps file. */
const ASK = {
  "1.13": "ทำหน้าลีดกับหน้าลูกค้าให้หน่อย",
  "1.14": "ทำหน้างานของฉันวันนี้ให้หน่อย",
  "2.1": "ทำหน้านำเข้าแปลงจาก Excel ให้หน่อย",
} as const;

/** Placeholder for a page the student builds in class. Claude replaces the page file. */
export function NotBuiltYet({ step }: { step: keyof typeof ASK }) {
  return (
    <EmptyState
      icon={NotBuiltIcon}
      tone="warn"
      title="หน้านี้ยังไม่ได้สร้าง"
      hint={`เปิดแชตใหม่ใน VS Code แล้วพิมพ์บอก Claude เช่น "${ASK[step]}"`}
    />
  );
}
