"use client";

import { useState } from "react";
import { setStageDocument } from "@/app/(app)/settings/actions";
import { Card, Notice, SectionTitle, StageBadge } from "@/components/ui/card";
import { DocumentIcon } from "@/lib/icons";
import { STAGES } from "@/config/stages";
import { Toggle } from "@/components/ui/toggle";
import { HelpHint } from "@/components/ui/help-hint";
import { useSave } from "./use-save";

/** What each document is, for the ⓘ next to its column. Add a line when you add a document in src/documents/. */
const DOC_HINT: Record<string, string> = {
  quotation: "ใบแจ้งราคาแปลงและแบบบ้านที่ลูกค้าสนใจ ให้ลูกค้าเอาไปตัดสินใจหรือใช้ยื่นกู้",
  reservation: "ใบยืนยันการจองแปลง พร้อมยอดเงินจอง ให้ลูกค้าเซ็นตอนวางเงินจอง",
};

/** Which document each stage can issue (stage × document checkboxes). Saves on every tick. */
export function StageDocumentsForm({
  docs,
  initial,
}: {
  docs: { key: string; title: string }[];
  initial: { stage: string; doc_key: string }[];
}) {
  const [on, setOn] = useState(() => new Set(initial.map((r) => `${r.stage}:${r.doc_key}`)));
  const { result, busy, run } = useSave();
  // Documents are for live deals; closed-lost stages have nothing to issue.
  const stages = STAGES.filter((s) => s.key !== "lost" && s.key !== "unqualified");

  const toggle = (stage: string, docKey: string, checked: boolean) => {
    const id = `${stage}:${docKey}`;
    const nextSet = new Set(on);
    if (checked) nextSet.add(id);
    else nextSet.delete(id);
    setOn(nextSet);
    run(
      () => setStageDocument({ stage, docKey, on: checked }),
      (r) => {
        if (!r.ok) setOn(new Set(on)); // put the tick back as it was
      },
    );
  };

  return (
    <Card className="flex flex-col gap-3">
      <SectionTitle
        icon={DocumentIcon}
        tone="ok"
        title="เอกสารที่เซลส์ออกได้"
        sub="เปิดสวิตช์ = เซลส์เห็นปุ่มออกเอกสารนั้นในหน้าลูกค้า เมื่อลูกค้าอยู่ขั้นนั้น · ปิด = ไม่เห็นปุ่ม"
      />
      <Notice tone="ok">
        ตัวอย่าง: เปิด &quot;ใบจอง&quot; ไว้เฉพาะขั้น &quot;จอง&quot; → เซลส์กดออกใบจองได้ก็ต่อเมื่อลูกค้าจองแล้วเท่านั้น
      </Notice>
      {result && !result.ok && <Notice tone="danger">{result.message}</Notice>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-line text-left text-ink-soft">
              <th className="py-2 pr-3 font-normal">ลูกค้าอยู่ขั้น</th>
              {docs.map((d) => (
                <th key={d.key} className="px-3 py-2 text-center font-normal">
                  <span className="inline-flex items-center gap-1">
                    {d.title}
                    <HelpHint ariaLabel={`${d.title} คืออะไร`}>{DOC_HINT[d.key] ?? d.title}</HelpHint>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stages.map((s) => (
              <tr key={s.key} className="border-b border-line last:border-0">
                <td className="py-2 pr-3">
                  <StageBadge stage={s.key} />
                </td>
                {docs.map((d) => (
                  <td key={d.key} className="px-3 py-2 text-center">
                    <span className="inline-flex">
                      <Toggle
                        aria-label={`${d.title} ตอนลูกค้าอยู่ขั้น ${s.label}`}
                        disabled={busy}
                        checked={on.has(`${s.key}:${d.key}`)}
                        onChange={(v) => toggle(s.key, d.key, v)}
                      />
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
