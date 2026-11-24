"use client";

import { useRef, useState } from "react";
import { moveUnitPin } from "@/app/(app)/projects/actions";
import { createUnitAtPin } from "@/app/(app)/projects/[id]/unit-actions";
import { Button } from "@/components/ui/button";
import { Card, Notice } from "@/components/ui/card";
import { Sheet } from "@/components/ui/confirm-card";
import { Field, Input } from "@/components/ui/field";
import { PlanViewer, type PlanViewerHandle } from "./plan-viewer";
import { PlotPicker } from "./plot-picker";
import { hasPin, type BoardUnit, type PlanView } from "./types";

/** Admin "แก้หมุด": drag a pin to move it, or pick a plot from the dropdown and tap the plan to place it.
 *  Every change is saved at once with move_unit_pin(). With no plot picked, a tap on an empty spot
 *  opens "เพิ่มแปลงใหม่ตรงนี้" for a plot printed on the plan but missing from the list. */
export function PinEditor({ plans, initialUnits }: { plans: PlanView[]; initialUnits: BoardUnit[] }) {
  const withPicture = plans.filter((p) => p.url);
  const [units, setUnits] = useState(initialUnits);
  const [planId, setPlanId] = useState(withPicture[0]?.id ?? null);
  const [editing, setEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [placingId, setPlacingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "warn" | "danger"; text: string } | null>(null);
  const viewer = useRef<PlanViewerHandle>(null);
  const [adding, setAdding] = useState<{ x: number; y: number } | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const plan = withPicture.find((p) => p.id === planId) ?? null;
  const planName = (id: string | null) => plans.find((p) => p.id === id)?.name ?? "";
  const pins = plan
    ? units
        .filter((u) => u.plan_id === plan.id && u.pos_x !== null && u.pos_y !== null)
        .map((u) => ({ id: u.id, code: u.code, status: u.status, interest: u.interest_count, price: u.price, x: u.pos_x!, y: u.pos_y! }))
    : [];
  const withoutPin = units.filter((u) => !hasPin(u)).length;
  const selected = units.find((u) => u.id === selectedId) ?? null;
  const placing = units.find((u) => u.id === placingId) ?? null;

  const save = async (unit: BoardUnit, next: { plan_id: string | null; pos_x: number | null; pos_y: number | null }, done: string) => {
    const before = { plan_id: unit.plan_id, pos_x: unit.pos_x, pos_y: unit.pos_y };
    setUnits((us) => us.map((u) => (u.id === unit.id ? { ...u, ...next } : u)));
    const res = await moveUnitPin({ unitId: unit.id, planId: next.plan_id, x: next.pos_x, y: next.pos_y });
    if (res.ok) setMsg({ tone: "ok", text: done });
    else {
      setUnits((us) => us.map((u) => (u.id === unit.id ? { ...u, ...before } : u)));
      setMsg({ tone: "danger", text: `บันทึกหมุด ${unit.code} ไม่สำเร็จ ลองใหม่อีกครั้ง` });
    }
  };

  const startAdd = (x: number, y: number) => {
    setAdding({ x, y });
    setForm(EMPTY_FORM);
    setFormError(null);
    setSelectedId(null);
    setMsg(null);
  };

  const addPlot = async () => {
    if (!plan || !adding || busy) return;
    const code = form.code.trim().toUpperCase();
    if (!code) return setFormError("ใส่เลขแปลง");
    if (units.some((u) => u.code.trim().toUpperCase() === code)) return setFormError(`มีแปลง ${code} ในโครงการนี้แล้ว`);
    const priceText = form.price.replace(/[,\s]/g, "");
    const price = priceText ? Number(priceText) : null;
    if (price !== null && (Number.isNaN(price) || price < 0)) return setFormError("ราคาต้องเป็นตัวเลข");
    setBusy(true);
    const res = await createUnitAtPin({
      planId: plan.id,
      code,
      zone: form.zone,
      house_type: form.house_type,
      price,
      x: adding.x,
      y: adding.y,
    });
    setBusy(false);
    if (!res.ok) return setFormError(res.error);
    setUnits((us) => [...us, res.unit]);
    setSelectedId(res.unit.id);
    setAdding(null);
    setMsg({ tone: "ok", text: `เพิ่มแปลง ${res.unit.code} และวางหมุดแล้ว` });
  };

  if (withPicture.length === 0) {
    return (
      <Card className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">แก้หมุด</h2>
        <Notice tone="warn">อัปโหลดรูปผังก่อน จึงจะแก้หมุดได้</Notice>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">แก้หมุด</h2>
          <p className="text-sm text-ink-soft">
            {pins.length} หมุดบนผังนี้ · ยังไม่มีหมุด {withoutPin} แปลง
          </p>
        </div>
        <Button
          variant={editing ? "primary" : "secondary"}
          aria-pressed={editing}
          onClick={() => {
            setEditing((e) => !e);
            setPlacingId(null);
            setAdding(null);
            setMsg(null);
          }}
        >
          {editing ? "เสร็จแล้ว" : "แก้หมุด"}
        </Button>
      </div>

      {withPicture.length > 1 && (
        <div role="tablist" aria-label="เลือกผัง" className="flex gap-2 overflow-x-auto">
          {withPicture.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={p.id === planId}
              onClick={() => {
                setPlanId(p.id);
                setSelectedId(null);
              }}
              className={`min-h-11 shrink-0 rounded-control border px-4 text-sm font-medium ${
                p.id === planId ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-ink"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {editing && (
        <>
          <PlotPicker
            units={units}
            label="เลือกแปลงที่จะวางหรือย้าย"
            describe={(u) => (!hasPin(u) ? "ยังไม่มีหมุด" : u.plan_id === planId ? "อยู่บนผังนี้" : `อยู่บน${planName(u.plan_id)}`)}
            onPick={(u) => {
              if (hasPin(u) && u.plan_id === planId) {
                setSelectedId(u.id);
                setPlacingId(null);
                viewer.current?.focusOn(u.pos_x!, u.pos_y!);
              } else {
                setPlacingId(u.id);
                setSelectedId(null);
                setMsg(null);
              }
            }}
          />
          {placing ? (
            <div className="flex items-center justify-between gap-3 rounded-control bg-brand-soft px-3 text-sm text-brand">
              <span>แตะบนผังตรงตำแหน่งของแปลง {placing.code}</span>
              <Button variant="ghost" onClick={() => setPlacingId(null)}>
                ยกเลิก
              </Button>
            </div>
          ) : (
            <p className="text-sm text-ink-soft">
              ลากหมุดเพื่อย้าย · แตะหมุดเพื่อเลือก · เลือกแปลงจากช่องด้านบนแล้วแตะผังเพื่อวาง · แปลงที่ไม่มีในรายการ
              แตะจุดว่างบนผังเพื่อเพิ่มแปลงใหม่
            </p>
          )}
        </>
      )}

      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      {plan && (
        <PlanViewer
          key={plan.id}
          ref={viewer}
          url={plan.url!}
          width={plan.image_w}
          height={plan.image_h}
          pins={pins}
          selectedId={selectedId ?? placingId}
          editable={editing}
          onPinTap={(id) => {
            setSelectedId(id);
            setPlacingId(null);
          }}
          onMovePin={(id, x, y) => {
            const u = units.find((v) => v.id === id);
            if (u) void save(u, { plan_id: plan.id, pos_x: x, pos_y: y }, `ย้ายหมุด ${u.code} แล้ว`);
          }}
          onPlace={
            !editing
              ? undefined
              : placing
                ? (x, y) => {
                    void save(placing, { plan_id: plan.id, pos_x: x, pos_y: y }, `วางหมุด ${placing.code} แล้ว`);
                    setSelectedId(placing.id);
                    setPlacingId(null);
                  }
                : startAdd
          }
        />
      )}

      {editing && selected && hasPin(selected) && (
        <div className="flex items-center justify-between gap-3 rounded-control border border-line p-3">
          <span className="font-medium">แปลง {selected.code}</span>
          <Button
            variant="ghost"
            className="text-danger"
            onClick={() => {
              void save(selected, { plan_id: null, pos_x: null, pos_y: null }, `เอาหมุด ${selected.code} ออกแล้ว`);
              setSelectedId(null);
            }}
          >
            เอาหมุดออก
          </Button>
        </div>
      )}

      <Sheet open={adding !== null} onClose={() => !busy && setAdding(null)} title="เพิ่มแปลงใหม่ตรงนี้">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void addPlot();
          }}
        >
          <p className="text-sm text-ink-soft">แปลงใหม่จะถูกเพิ่มในรายการแปลง สถานะ &quot;ว่าง&quot; และวางหมุดตรงจุดที่แตะ</p>
          <Field label="เลขแปลง" required error={formError ?? undefined}>
            <Input
              value={form.code}
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="เช่น A21"
              onChange={(e) => {
                setForm((f) => ({ ...f, code: e.target.value }));
                setFormError(null);
              }}
            />
          </Field>
          <Field label="โซน/เฟส">
            <Input value={form.zone} onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))} />
          </Field>
          <Field label="แบบบ้าน">
            <Input value={form.house_type} onChange={(e) => setForm((f) => ({ ...f, house_type: e.target.value }))} />
          </Field>
          <Field label="ราคา (บาท)" hint="ไม่ใส่ก็ได้">
            <Input
              value={form.price}
              inputMode="decimal"
              placeholder="เช่น 3,290,000"
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            />
          </Field>
          <div className="flex flex-col gap-2">
            <Button type="submit" full disabled={busy}>
              {busy ? "กำลังบันทึก" : "เพิ่มแปลงและวางหมุด"}
            </Button>
            <Button variant="secondary" full disabled={busy} onClick={() => setAdding(null)}>
              ยกเลิก
            </Button>
          </div>
        </form>
      </Sheet>
    </Card>
  );
}

const EMPTY_FORM = { code: "", zone: "", house_type: "", price: "" };
