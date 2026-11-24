import { EmptyState } from "@/components/ui/card";
import { NotBuiltIcon } from "@/lib/icons";

const STEP_FILE = {
  "1.13": "docs/steps/1.13-leads.md",
  "1.14": "docs/steps/1.14-today.md",
  "2.1": "docs/steps/2.1-unit-import.md",
} as const;

/** Placeholder for a page the student builds in class. Claude replaces the page file. */
export function NotBuiltYet({ step }: { step: keyof typeof STEP_FILE }) {
  return (
    <EmptyState
      icon={NotBuiltIcon}
      tone="warn"
      title={`หน้านี้สร้างในขั้น ${step}`}
      hint={`เปิดแชตใหม่ใน VS Code แล้วพิมพ์: ทำขั้น ${step} ตาม ${STEP_FILE[step]}`}
    />
  );
}
