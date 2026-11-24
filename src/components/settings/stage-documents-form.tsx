"use client";

import { useState } from "react";
import { setStageDocument } from "@/app/(app)/settings/actions";
import { Card, Notice, SectionTitle } from "@/components/ui/card";
import { DocumentIcon } from "@/lib/icons";
import { STAGES } from "@/config/stages";
import { ToggleRow } from "@/components/ui/toggle";
import { useSave } from "./use-save";

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
        title="เอกสารแต่ละขั้น"
        sub="เปิดเอกสารที่เซลส์ออกได้ในแต่ละขั้น ปุ่มออกเอกสารในหน้าลูกค้าเปลี่ยนตามนี้ทันที"
      />
      {result && !result.ok && <Notice tone="danger">{result.message}</Notice>}
      <div className="flex flex-col gap-3">
        {stages.map((s) => (
          <fieldset key={s.key} className="flex flex-col border-b border-line pb-2">
            <legend className="text-sm font-medium">{s.label}</legend>
            <div className="grid gap-x-6 sm:grid-cols-2">
              {docs.map((d) => (
                <ToggleRow
                  key={d.key}
                  title={d.title}
                  disabled={busy}
                  checked={on.has(`${s.key}:${d.key}`)}
                  onChange={(v) => toggle(s.key, d.key, v)}
                />
              ))}
            </div>
          </fieldset>
        ))}
      </div>
    </Card>
  );
}
