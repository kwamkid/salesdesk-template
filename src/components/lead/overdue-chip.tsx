"use client";

import { useRef, useState } from "react";
import { Badge } from "@/components/ui/card";
import { Popover } from "@/components/ui/popover";
import { thDate } from "@/lib/format";

/** "เลย N วัน" chip. A tap shows the follow-up date that was missed. */
export function OverdueChip({ days, dueDate, label }: { days?: number; dueDate: string | null; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const text = label ?? `เลย ${days ?? 0} วัน`;
  if (!dueDate) return <Badge tone="danger">{text}</Badge>;
  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-expanded={open}
        aria-label={`${text} ดูวันที่ต้องตาม`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        // 44px tap area around the small chip
        className="relative inline-flex shrink-0 before:absolute before:-inset-x-1 before:-inset-y-2.5 before:content-['']"
      >
        <Badge tone="danger">{text}</Badge>
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref} align="start" width={220} ariaLabel="วันที่ต้องตาม">
        <p className="text-sm text-ink-soft">กำหนดตามเดิม</p>
        <p className="font-semibold text-danger">{thDate(dueDate)}</p>
      </Popover>
    </>
  );
}
