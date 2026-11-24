"use client";

import { useState } from "react";
import { addLostReason, updateLostReason } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Badge, Card, Notice, SectionTitle } from "@/components/ui/card";
import { LostReasonIcon } from "@/lib/icons";
import { Field, Input } from "@/components/ui/field";
import { Toggle } from "@/components/ui/toggle";
import { useSave } from "./use-save";

export type LostReason = { id: string; label: string; sort: number; is_active: boolean };

function ReasonRow({ r }: { r: LostReason }) {
  const [label, setLabel] = useState(r.label);
  const [sort, setSort] = useState(String(r.sort));
  const { result, busy, run } = useSave();
  const changed = label.trim() !== r.label || Number(sort) !== r.sort;

  const save = (isActive: boolean) => run(() => updateLostReason({ id: r.id, label, sort: Number(sort), isActive }));

  return (
    <li className="flex flex-col gap-2 border-b border-line pb-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{r.label}</span>
        <span className="flex items-center gap-1">
          {r.is_active ? <Badge tone="ok">ใช้อยู่</Badge> : <Badge>ปิดแล้ว</Badge>}
          <Toggle
            checked={r.is_active}
            loading={busy}
            onChange={(v) => save(v)}
            aria-label={r.is_active ? `ปิดเหตุผล ${r.label}` : `เปิดใช้เหตุผล ${r.label} อีกครั้ง`}
          />
        </span>
      </div>
      {result && !result.ok && <Notice tone="danger">{result.message}</Notice>}
      <div className="grid grid-cols-[1fr_6rem] gap-2">
        <Input aria-label={`ชื่อเหตุผล ${r.label}`} value={label} onChange={(e) => setLabel(e.target.value)} />
        <Input aria-label={`ลำดับของ ${r.label}`} inputMode="numeric" value={sort} onChange={(e) => setSort(e.target.value)} />
      </div>
      {changed && (
        <div className="flex justify-end">
          <Button variant="secondary" disabled={busy} onClick={() => save(r.is_active)}>
            บันทึกการแก้ไข
          </Button>
        </div>
      )}
    </li>
  );
}

/** Reasons a sales person must pick when a lead becomes "ไม่ซื้อ". Lower number shows first. */
export function LostReasonsForm({ reasons }: { reasons: LostReason[] }) {
  const next = reasons.reduce((m, r) => Math.max(m, r.sort), 0) + 1;
  const [label, setLabel] = useState("");
  const { result, busy, run } = useSave();

  return (
    <Card className="flex flex-col gap-3">
      <SectionTitle
        icon={LostReasonIcon}
        tone="danger"
        title="เหตุผลที่ไม่ซื้อ"
        sub="ตัวเลขด้านขวาคือลำดับที่แสดง เลขน้อยขึ้นก่อน เหตุผลที่ปิดแล้วยังอยู่ในลูกค้าเดิม"
      />
      {result && <Notice tone={result.ok ? "ok" : "danger"}>{result.message}</Notice>}
      <Field label="เหตุผลใหม่">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} />
      </Field>
      <Button
        full
        disabled={!label.trim() || busy}
        onClick={() => run(() => addLostReason({ label, sort: next }), (r) => r.ok && setLabel(""))}
      >
        {busy ? "กำลังเพิ่ม" : "เพิ่มเหตุผล"}
      </Button>
      <ul className="flex flex-col gap-3">
        {reasons.map((r) => (
          <ReasonRow key={`${r.id}-${r.label}-${r.sort}-${r.is_active}`} r={r} />
        ))}
      </ul>
    </Card>
  );
}
