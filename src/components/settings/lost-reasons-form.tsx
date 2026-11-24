"use client";

import { useState } from "react";
import { addLostReason, updateLostReason } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Card, Notice, SectionTitle } from "@/components/ui/card";
import { LostReasonIcon } from "@/lib/icons";
import { Input } from "@/components/ui/field";
import { Toggle } from "@/components/ui/toggle";
import { useSave } from "./use-save";

export type LostReason = {
  id: string;
  label: string;
  sort: number;
  is_active: boolean;
};

/** One line: the reason, a pencil to rename it, and a switch (off = sales can no longer pick it). */
function ReasonRow({ r }: { r: LostReason }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(r.label);
  const { result, busy, run } = useSave();

  const save = (isActive: boolean, newLabel = r.label) =>
    run(
      () =>
        updateLostReason({ id: r.id, label: newLabel, sort: r.sort, isActive }),
      (res) => res.ok && setEditing(false),
    );

  return (
    <li className="flex flex-col gap-1 py-1.5">
      <div className="flex min-h-11 items-center gap-2">
        {editing ? (
          <form
            className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              save(r.is_active, label);
            }}
          >
            <div className="min-w-0 flex-[1_1_12rem]">
              <Input
                aria-label={`แก้ชื่อเหตุผล ${r.label}`}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                autoFocus
              />
            </div>
            <Button type="submit" disabled={busy || !label.trim()}>
              บันทึก
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => (setEditing(false), setLabel(r.label))}
            >
              ยกเลิก
            </Button>
          </form>
        ) : (
          <>
            <span
              className={`min-w-0 flex-1 break-words ${r.is_active ? "text-ink" : "text-ink-soft line-through"}`}
            >
              {r.label}
            </span>
            <IconButton
              kind="edit"
              label={`แก้ชื่อเหตุผล ${r.label}`}
              onClick={() => setEditing(true)}
            />
            <Toggle
              checked={r.is_active}
              loading={busy}
              onChange={(v) => save(v)}
              aria-label={
                r.is_active
                  ? `ปิดเหตุผล ${r.label}`
                  : `เปิดใช้เหตุผล ${r.label} อีกครั้ง`
              }
            />
          </>
        )}
      </div>
      {result && !result.ok && <Notice tone="danger">{result.message}</Notice>}
    </li>
  );
}

/** Reasons a sales person picks when a lead becomes "ไม่ซื้อ". New ones go to the end of the list. */
export function LostReasonsForm({ reasons }: { reasons: LostReason[] }) {
  const next = reasons.reduce((m, r) => Math.max(m, r.sort), 0) + 1;
  const [label, setLabel] = useState("");
  const { result, busy, run } = useSave();

  return (
    <Card className="flex flex-col gap-3">
      <SectionTitle
        icon={LostReasonIcon}
        tone="danger"
        title="เหตุผลที่ลูกค้าไม่ซื้อ"
        sub="ตัวเลือกที่เซลส์กดเลือกตอนเปลี่ยนลูกค้าเป็น “ไม่ซื้อ” · หน้าภาพรวมสรุปให้ว่าเสียลูกค้าเพราะอะไรมากที่สุด"
      />
      {result && !result.ok && <Notice tone="danger">{result.message}</Notice>}
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => addLostReason({ label, sort: next }),
            (r) => r.ok && setLabel(""),
          );
        }}
      >
        <Input
          aria-label="เหตุผลใหม่"
          placeholder="พิมพ์เหตุผลใหม่ เช่น ที่ตั้งไกลที่ทำงาน"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <Button type="submit" icon="add" className="shrink-0" disabled={!label.trim() || busy}>
          {busy ? "กำลังเพิ่ม" : "เพิ่ม"}
        </Button>
      </form>
      <ul className="flex flex-col divide-y divide-line">
        {reasons.map((r) => (
          <ReasonRow key={`${r.id}-${r.label}-${r.is_active}`} r={r} />
        ))}
      </ul>
    </Card>
  );
}
