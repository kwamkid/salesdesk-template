"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Read-only text with a copy button (for text the user pastes into Claude). */
export function CopyBox({ label, text, rows = 8 }: { label: string; text: string; rows?: number }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("done");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{label}</span>
        <textarea
          readOnly
          rows={rows}
          value={text}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-control border border-line bg-bg px-3 py-2 text-sm text-ink"
        />
      </label>
      <div className="flex items-center gap-3">
        <Button variant="secondary" onClick={copy}>
          {state === "done" ? "คัดลอกแล้ว" : "คัดลอกข้อความ"}
        </Button>
        <span role="status" className="text-sm text-ink-soft">
          {state === "done" && "คัดลอกแล้ว นำไปวางใน Claude ได้เลย"}
          {state === "failed" && "คัดลอกไม่สำเร็จ ให้กดค้างที่ข้อความแล้วเลือกคัดลอกเอง"}
        </span>
      </div>
    </div>
  );
}
