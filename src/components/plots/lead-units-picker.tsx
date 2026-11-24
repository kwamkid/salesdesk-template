"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toggleInterest } from "@/app/(app)/plots/actions";
import { Button, buttonClass } from "@/components/ui/button";
import { Badge, Card, Notice } from "@/components/ui/card";
import { Sheet } from "@/components/ui/confirm-card";
import { unitStatusOf } from "@/config/units";
import { baht } from "@/lib/format";
import { PlotPicker } from "./plot-picker";
import { hasPin, type BoardUnit } from "./types";

/** Client part of <LeadUnits>: the customer's plots and the "เลือกแปลงที่สนใจ" sheet. */
export function LeadUnitsPicker({
  leadId,
  projectId,
  editable,
  units,
  initialInterestIds,
}: {
  leadId: string;
  projectId: string;
  editable: boolean;
  units: BoardUnit[];
  initialInterestIds: string[];
}) {
  const [interest, setInterest] = useState(() => new Set(initialInterestIds));
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<BoardUnit | null>(null);
  const [error, setError] = useState("");
  const [busy, start] = useTransition();

  const reserved = units.filter((u) => u.lead_id === leadId);
  const liked = units.filter((u) => interest.has(u.id));
  const planHref = (u: BoardUnit) => `/plots?project=${projectId}&unit=${u.id}`;

  const toggle = (u: BoardUnit, on: boolean) =>
    start(async () => {
      setError("");
      const res = await toggleInterest({ unitId: u.id, leadId, on });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setInterest((s) => {
        const n = new Set(s);
        if (on) n.add(u.id);
        else n.delete(u.id);
        return n;
      });
    });

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">แปลง</h2>
      {error && !open && <Notice tone="danger">{error}</Notice>}

      {reserved.map((u) => (
        <div key={u.id} className="flex items-center justify-between gap-3 rounded-control bg-bg p-3">
          <p className="min-w-0">
            <span className="font-medium">แปลง {u.code}</span>{" "}
            <Badge tone={unitStatusOf(u.status).tone}>{unitStatusOf(u.status).label}</Badge>
            <span className="block text-sm text-ink-soft">{baht(u.price)}</span>
          </p>
          <Link href={planHref(u)} className={buttonClass("secondary")}>
            ดูบนผัง
          </Link>
        </div>
      ))}

      <div>
        <p className="mb-1 text-sm font-medium">แปลงที่สนใจ</p>
        {liked.length === 0 ? (
          <p className="text-sm text-ink-soft">ยังไม่ได้เลือกแปลงที่สนใจ</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {liked.map((u) => (
              <li key={u.id} className="flex min-h-11 items-center justify-between gap-3 py-1">
                <Link href={planHref(u)} className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{u.code}</span>{" "}
                  <span className="text-sm text-ink-soft">
                    {unitStatusOf(u.status).label} · {baht(u.price)}
                  </span>
                </Link>
                {editable && (
                  <Button
                    variant="ghost"
                    disabled={busy}
                    aria-label={`เอาแปลง ${u.code} ออกจากที่สนใจ`}
                    onClick={() => toggle(u, false)}
                  >
                    เอาออก
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {editable && (
        <Button variant="secondary" full onClick={() => setOpen(true)} disabled={units.length === 0}>
          {units.length === 0 ? "โครงการนี้ยังไม่มีรายการแปลง" : "เลือกแปลงที่สนใจ"}
        </Button>
      )}

      <Sheet
        open={open}
        onClose={() => {
          setOpen(false);
          setPicked(null);
          setError("");
        }}
        title="เลือกแปลงที่สนใจ"
      >
        <div className="flex flex-col gap-3">
          <PlotPicker units={units} onPick={setPicked} describe={(u) => (interest.has(u.id) ? "สนใจแล้ว" : "")} />
          {error && <Notice tone="danger">{error}</Notice>}
          {picked && (
            <div className="flex flex-col gap-2 rounded-control border border-line p-3">
              <p>
                <span className="font-medium">แปลง {picked.code}</span>{" "}
                <Badge tone={unitStatusOf(picked.status).tone}>{unitStatusOf(picked.status).label}</Badge>
                <span className="block text-sm text-ink-soft">
                  {[picked.zone && `โซน ${picked.zone}`, picked.house_type, baht(picked.price)].filter(Boolean).join(" · ")}
                </span>
              </p>
              {interest.has(picked.id) ? (
                <Button variant="secondary" full disabled={busy} onClick={() => toggle(picked, false)}>
                  {busy ? "กำลังบันทึก" : `เอาแปลง ${picked.code} ออกจากที่สนใจ`}
                </Button>
              ) : (
                <Button full disabled={busy} onClick={() => toggle(picked, true)}>
                  {busy ? "กำลังบันทึก" : `เพิ่มแปลง ${picked.code} เป็นแปลงที่สนใจ`}
                </Button>
              )}
              {hasPin(picked) && (
                <Link href={planHref(picked)} className={buttonClass("ghost", true)}>
                  ดูบนผัง
                </Link>
              )}
            </div>
          )}
          <Link href={`/plots?project=${projectId}`} className="min-h-11 py-3 text-center text-sm text-brand underline">
            เปิดผังโครงการ
          </Link>
        </div>
      </Sheet>
    </Card>
  );
}
