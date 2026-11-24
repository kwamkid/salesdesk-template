"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, Notice, SectionTitle } from "@/components/ui/card";
import { StageValueIcon } from "@/lib/icons";
import { Input } from "@/components/ui/field";
import { HelpHint } from "@/components/ui/help-hint";
import { StickyActionBar } from "@/components/ui/sticky-action-bar";
import { Toggle } from "@/components/ui/toggle";
import { STAGES, type StageKey } from "@/config/stages";
import { saveStageSettings, type StageSettingInput } from "../actions";
import { DEFAULT_EVENT, EVENT_STAGES } from "./event-stages";

const PLOT_PRICE_STAGES: StageKey[] = ["reserved", "contracted", "transferred"];

/** One line per stage for the ⓘ next to its name: when the event fires and what Meta learns from it. */
const STAGE_HINT: Partial<Record<StageKey, string>> = {
  new: "ส่งเมื่อมีลีดเข้าระบบ บอก Meta ว่าโฆษณาได้รายชื่อลูกค้ามา 1 คน",
  qualified: "ส่งเมื่อเซลส์ยืนยันว่าลูกค้ามีงบและสนใจจริง Meta จะหาคนแบบนี้เพิ่ม",
  appointment: "ส่งเมื่อลูกค้านัดวันมาชมโครงการ",
  visited: "ส่งเมื่อเช็กอินว่าลูกค้ามาชมโครงการแล้ว",
  reserved: "ส่งเมื่อลูกค้าจองแปลง มูลค่าใช้ราคาแปลงถ้าผูกแปลงไว้",
  contracted: "ส่งเมื่อทำสัญญา มูลค่าใช้ราคาแปลงถ้าผูกแปลงไว้",
  transferred: "ส่งเมื่อโอนกรรมสิทธิ์ ถือเป็นยอดขายจริง มูลค่าใช้ราคาแปลงถ้าผูกแปลงไว้",
};

type Row = { stage: StageKey; value: string; send_event: boolean; event_name: string };

/** Admin: value of each stage and the Meta event it sends, for one project (table stage_settings). */
export function StageSettingsForm({
  projectId,
  initial,
}: {
  projectId: string;
  initial: { stage: string; value: number | null; send_event: boolean; event_name: string }[];
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    EVENT_STAGES.map((stage) => {
      const r = initial.find((i) => i.stage === stage);
      // no row in the database = send the default event, no value
      return { stage, value: r?.value == null ? "" : String(r.value), send_event: r?.send_event ?? true, event_name: r?.event_name ?? "" };
    }),
  );
  const [msg, setMsg] = useState<{ tone: "ok" | "danger"; text: string } | null>(null);
  const [busy, start] = useTransition();

  const set = (stage: StageKey, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.stage === stage ? { ...r, ...patch } : r)));

  const save = () =>
    start(async () => {
      const payload: StageSettingInput[] = rows.map((r) => ({
        stage: r.stage,
        value: r.value.trim() === "" ? null : Number(r.value.replace(/,/g, "")),
        send_event: r.send_event,
        event_name: r.event_name,
      }));
      if (payload.some((p) => p.value !== null && (Number.isNaN(p.value) || p.value < 0))) {
        setMsg({ tone: "danger", text: "มูลค่าต้องเป็นตัวเลขที่ไม่ติดลบ" });
        return;
      }
      const res = await saveStageSettings(projectId, payload);
      setMsg(res.ok ? { tone: "ok", text: "บันทึกแล้ว" } : { tone: "danger", text: res.error });
    });

  return (
    <Card className="flex flex-col gap-3">
      <SectionTitle
        icon={StageValueIcon}
        tone="warn"
        title="มูลค่าและ event ของแต่ละขั้น"
        sub={
          <>
            มูลค่าที่ส่งไป Meta เมื่อลูกค้าเข้าขั้นนั้น ขั้นจอง ทำสัญญา และโอน ใช้ราคาแปลงแทน ถ้าลูกค้าผูกกับแปลงแล้ว
            ช่องชื่อ event ว่างไว้ = ใช้ชื่อมาตรฐาน
          </>
        }
      />
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <ul className="flex flex-col divide-y divide-line">
        {rows.map((r) => {
          const label = STAGES.find((s) => s.key === r.stage)?.label ?? r.stage;
          return (
            <li key={r.stage} className="flex flex-col gap-2 py-3 md:grid md:grid-cols-4 md:items-center md:gap-3">
              <p className="font-medium">
                {label}
                {STAGE_HINT[r.stage] && <HelpHint ariaLabel={`ความหมายของขั้น ${label}`}>{STAGE_HINT[r.stage]}</HelpHint>}
                {PLOT_PRICE_STAGES.includes(r.stage) && (
                  <span className="block text-xs font-normal text-ink-soft">ใช้ราคาแปลงถ้ามี</span>
                )}
              </p>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-ink-soft">
                  มูลค่า (บาท)
                  <HelpHint ariaLabel="มูลค่าคืออะไร">ตัวเลขที่ส่งไปกับ event ให้ Meta รู้ว่าลูกค้าขั้นนี้มีค่าเท่าไร ว่างไว้ = ไม่ส่งมูลค่า</HelpHint>
                </span>
                <Input inputMode="decimal" value={r.value} onChange={(e) => set(r.stage, { value: e.target.value })} placeholder="ไม่ระบุ" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-ink-soft">
                  ชื่อ event
                  <HelpHint ariaLabel="ชื่อ event คืออะไร">
                    ชื่อที่เห็นใน Meta Events Manager ว่างไว้ = ใช้ชื่อมาตรฐาน {DEFAULT_EVENT[r.stage]}
                  </HelpHint>
                </span>
                <Input
                  value={r.event_name}
                  onChange={(e) => set(r.stage, { event_name: e.target.value })}
                  placeholder={DEFAULT_EVENT[r.stage]}
                  disabled={!r.send_event}
                />
              </label>
              <div className="flex items-center gap-2 text-sm">
                <Toggle
                  checked={r.send_event}
                  onChange={(v) => set(r.stage, { send_event: v })}
                  aria-label={`ส่ง event ขั้น ${label} ไป Meta`}
                />
                <span aria-hidden>ส่ง event ไป Meta</span>
              </div>
            </li>
          );
        })}
      </ul>
      <StickyActionBar
        hint={msg?.tone === "ok" ? "บันทึกแล้ว" : undefined}
        primary={
          <Button disabled={busy} onClick={save}>
            {busy ? "กำลังบันทึก" : "บันทึกมูลค่าและ event"}
          </Button>
        }
      />
    </Card>
  );
}
