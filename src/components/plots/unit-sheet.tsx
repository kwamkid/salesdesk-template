"use client";

import { useEffect, useState, useTransition } from "react";
import { setUnitStatus } from "@/app/(app)/plots/actions";
import { HouseModelPicture } from "@/components/projects/house-model-picture";
import type { HouseModel } from "@/components/projects/load";
import { AvatarName } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge, Notice } from "@/components/ui/card";
import { ConfirmCard, Sheet } from "@/components/ui/confirm-card";
import { Input } from "@/components/ui/field";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { InfoList, type InfoItem } from "@/components/ui/info-list";
import type { Role } from "@/config/roles";
import { houseCategoryOf } from "@/config/houses";
import { STAGES, stageOf } from "@/config/stages";
import { unitStatusOf, type UnitStatus } from "@/config/units";
import { baht, num } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { isFree, type BoardUnit } from "./types";

type LeadOption = { id: string; full_name: string; phone: string; stage: string };

const OPEN_STAGES = STAGES.filter((s) => s.open).map((s) => s.key);

const NEXT: Partial<Record<UnitStatus, { status: UnitStatus; verb: string }>> = {
  available: { status: "reserved", verb: "จอง" },
  interested: { status: "reserved", verb: "จอง" },
  reserved: { status: "contracted", verb: "ทำสัญญา" },
  contracted: { status: "transferred", verb: "โอน" },
};

const CONSEQUENCE: Partial<Record<UnitStatus, string>> = {
  reserved:
    "แปลงนี้จะถูกล็อกให้ลูกค้ารายนี้ทันที คนอื่นจองซ้อนไม่ได้ ขั้นของลูกค้าเปลี่ยนเป็น \"จอง\" และส่ง event ไป Meta ด้วยราคาแปลง การยกเลิกจองทำได้เฉพาะแอดมิน",
  contracted:
    "สถานะแปลงเปลี่ยนเป็น \"ทำสัญญา\" ขั้นของลูกค้าเปลี่ยนเป็น \"ทำสัญญา\" และส่ง event ไป Meta ด้วยราคาแปลง ย้อนกลับได้เฉพาะแอดมิน",
  transferred:
    "สถานะแปลงเปลี่ยนเป็น \"โอน\" ขั้นของลูกค้าเปลี่ยนเป็น \"โอน\" (ปิดการขาย) และส่ง event ไป Meta ด้วยราคาแปลง ย้อนกลับได้เฉพาะแอดมิน",
  available:
    "แปลงจะกลับเป็นว่าง (หรือ \"มีคนสนใจ\" ถ้ายังมีลูกค้าสนใจอยู่) และหลุดจากลูกค้ารายเดิม ขั้นของลูกค้าไม่ถูกย้อนให้อัตโนมัติ แก้ที่หน้าลูกค้าถ้าจำเป็น",
};

/** Search the caller's open customers of one project. Row Level Security limits sales to their own. */
function CustomerChooser({
  projectId,
  ownerId,
  onPick,
}: {
  projectId: string;
  ownerId: string | null;
  onPick: (lead: LeadOption) => void;
}) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<LeadOption[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let stale = false;
    const timer = setTimeout(async () => {
      let query = supabase
        .from("leads")
        .select("id, full_name, phone, stage")
        .eq("project_id", projectId)
        .in("stage", OPEN_STAGES)
        .order("full_name")
        .limit(30);
      if (ownerId) query = query.eq("owner_id", ownerId);
      const term = q.trim().replace(/[,()%*\\]/g, " ").trim();
      if (term) query = query.or(`full_name.ilike.%${term}%,phone.ilike.%${term.replace(/[^0-9]/g, "") || term}%`);
      const { data } = await query;
      if (!stale) setRows((data ?? []) as LeadOption[]);
    }, 250);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [q, projectId, ownerId]);

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">เลือกลูกค้า (ลูกค้าที่ยังเปิดอยู่ของโครงการนี้)</span>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="พิมพ์ชื่อหรือเบอร์โทร" enterKeyHint="search" />
      </label>
      {rows === null ? (
        <p className="text-sm text-ink-soft">กำลังโหลด</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-ink-soft">ไม่พบลูกค้า เพิ่มลีดก่อนที่เมนู &quot;เพิ่มลีด&quot;</p>
      ) : (
        <ul className="flex max-h-60 flex-col overflow-y-auto rounded-control border border-line">
          {rows.map((l) => (
            <li key={l.id} className="border-b border-line last:border-b-0">
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-between gap-3 px-3 text-left"
                onClick={() => onPick(l)}
              >
                <span className="min-w-0">
                  <span className="block truncate">{l.full_name}</span>
                  <span className="block text-sm text-ink-soft">{l.phone}</span>
                </span>
                <Badge tone={stageOf(l.stage).tone}>{stageOf(l.stage).label}</Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Holder sales person with their picture. unit_board() gives only the name, so the picture is read
 *  through the reserved lead's owner; when Row Level Security hides that lead, the letter avatar stays. */
function Holder({ leadId, name }: { leadId: string | null; name: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!leadId) return;
    let alive = true;
    void createClient()
      .from("leads")
      .select("owner:profiles!owner_id(avatar_url)")
      .eq("id", leadId)
      .maybeSingle()
      .then(({ data }) => {
        const owner = Array.isArray(data?.owner) ? data.owner[0] : data?.owner;
        if (alive) setUrl((owner as { avatar_url?: string } | null | undefined)?.avatar_url ?? "");
      });
    return () => {
      alive = false;
    };
  }, [leadId]);
  return <AvatarName name={name} url={url} />;
}

/** Bottom sheet with one plot's details and the actions the caller may take on it.
 *  Executives are read only. Sales act on their own customers. The admin can also cancel. */
export function UnitSheet({
  unit,
  model,
  projectId,
  role,
  meId,
  onClose,
  onChanged,
}: {
  unit: BoardUnit | null;
  /** The plot's house model (picture URL from the server), when it has one. */
  model?: HouseModel | null;
  projectId: string;
  role: Role;
  meId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [choosing, setChoosing] = useState(false);
  const [confirm, setConfirm] = useState<{ status: UnitStatus; lead: { id: string | null; name: string } } | null>(null);
  const [error, setError] = useState("");
  const [viewPicture, setViewPicture] = useState(false);
  const [busy, start] = useTransition();

  const close = () => {
    setChoosing(false);
    setConfirm(null);
    setError("");
    onClose();
  };

  if (!unit) return null;

  const st = unitStatusOf(unit.status);
  const canAct = role === "admin" || role === "sales";
  const next = NEXT[unit.status];
  // Moving an already-held plot forward needs the customer: the owner (mine) or the admin.
  const canMoveForward = canAct && next && (isFree(unit.status) || role === "admin" || unit.mine);
  const canCancel = role === "admin" && !isFree(unit.status);

  const run = () =>
    start(async () => {
      if (!confirm) return;
      const res = await setUnitStatus({ unitId: unit.id, status: confirm.status, leadId: confirm.lead.id });
      if (res.ok) {
        setConfirm(null);
        setChoosing(false);
        setError("");
        onChanged();
        onClose();
      } else {
        setConfirm(null);
        setError(res.error);
        onChanged();
      }
    });

  const rows: InfoItem[] = [
    { label: "โซน / เฟส", value: unit.zone || "-" },
    ...(unit.model_name ? [] : [{ label: "แบบบ้าน", value: unit.house_type || "-" }]),
    { label: "ที่ดิน", value: unit.land_sqw === null ? "-" : `${num(unit.land_sqw)} ตร.ว.` },
    { label: "พื้นที่ใช้สอย", value: unit.usable_sqm === null ? "-" : `${num(unit.usable_sqm)} ตร.ม.` },
    { label: "ราคา", value: baht(unit.price) },
    { label: "คนสนใจ", value: `${unit.interest_count} คน` },
  ];
  if (unit.holder_name) rows.push({ label: "เซลส์ที่ถือ", value: <Holder leadId={unit.lead_id} name={unit.holder_name} /> });
  if (unit.lead_name) rows.push({ label: "ลูกค้า", value: unit.lead_name });
  if (unit.note) rows.push({ label: "หมายเหตุ", value: unit.note });

  const confirmVerb = confirm?.status === "available" ? "ยกเลิกจอง" : (NEXT[unit.status]?.verb ?? "");

  return (
    <>
      {/* The confirm card opens on top of this sheet; closing it returns here. */}
      <Sheet open onClose={close} title={`แปลง ${unit.code}`}>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Badge tone={st.tone}>{st.label}</Badge>
            {unit.mine && <span className="text-sm text-ink-soft">ลูกค้าของคุณ</span>}
          </div>
          {error && <Notice tone="danger">{error}</Notice>}
          {unit.model_name && (
            <div className="flex items-center gap-3 rounded-control border border-line p-2">
              {model?.image_url ? (
                <button
                  type="button"
                  onClick={() => setViewPicture(true)}
                  aria-label={`ดูรูปแบบ ${unit.model_name} เต็มจอ`}
                  className="h-16 w-24 shrink-0 cursor-zoom-in overflow-hidden rounded-control bg-bg"
                >
                  <HouseModelPicture url={model.image_url} name={unit.model_name} small />
                </button>
              ) : (
                <div className="h-16 w-24 shrink-0 overflow-hidden rounded-control bg-bg">
                  <HouseModelPicture url={null} name={unit.model_name} small />
                </div>
              )}
              <ImageLightbox
                images={viewPicture && model?.image_url ? [{ src: model.image_url, caption: `แบบ ${unit.model_name}` }] : null}
                onClose={() => setViewPicture(false)}
              />
              <div className="flex min-w-0 flex-col items-start gap-1">
                <p className="truncate font-semibold">แบบ {unit.model_name}</p>
                <Badge tone={houseCategoryOf(unit.model_category).tone}>{houseCategoryOf(unit.model_category).label}</Badge>
                {model && (model.bedrooms !== null || model.bathrooms !== null) && (
                  <p className="text-xs text-ink-soft">
                    {[
                      model.bedrooms !== null ? `${num(model.bedrooms)} ห้องนอน` : "",
                      model.bathrooms !== null ? `${num(model.bathrooms)} ห้องน้ำ` : "",
                      model.parking !== null ? `จอดรถ ${num(model.parking)} คัน` : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
            </div>
          )}
          <InfoList layout="rows" items={rows} />

          {role === "executive" && <p className="text-sm text-ink-soft">ผู้บริหารดูได้อย่างเดียว</p>}

          {canMoveForward && next && isFree(unit.status) && !choosing && (
            <Button full onClick={() => setChoosing(true)}>
              จองแปลง {unit.code} ให้ลูกค้า
            </Button>
          )}
          {canMoveForward && next && isFree(unit.status) && choosing && (
            <CustomerChooser
              projectId={projectId}
              ownerId={role === "sales" ? meId : null}
              onPick={(l) => setConfirm({ status: next.status, lead: { id: l.id, name: l.full_name } })}
            />
          )}
          {canMoveForward && next && !isFree(unit.status) && (
            <Button
              full
              onClick={() =>
                setConfirm({ status: next.status, lead: { id: unit.lead_id, name: unit.lead_name ?? "ลูกค้าเดิมของแปลงนี้" } })
              }
            >
              เปลี่ยนเป็น{next.verb} แปลง {unit.code}
            </Button>
          )}
          {canCancel && (
            <Button
              variant="secondary"
              full
              onClick={() =>
                setConfirm({ status: "available", lead: { id: null, name: unit.lead_name ?? "ลูกค้าเดิมของแปลงนี้" } })
              }
            >
              ยกเลิกจอง / กลับเป็นว่าง
            </Button>
          )}
          {canAct && !canMoveForward && !canCancel && !isFree(unit.status) && unit.status !== "transferred" && (
            <p className="text-sm text-ink-soft">แปลงนี้เป็นของลูกค้าเซลส์คนอื่น เปลี่ยนสถานะได้เฉพาะเจ้าของลูกค้าหรือแอดมิน</p>
          )}
        </div>
      </Sheet>

      <ConfirmCard
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={run}
        busy={busy}
        danger={confirm?.status === "available"}
        title={confirm?.status === "available" ? `ยกเลิกจองแปลง ${unit.code}` : `${confirmVerb}แปลง ${unit.code}`}
        rows={[
          { label: "แปลง", value: `${unit.code}${unit.zone ? ` (โซน ${unit.zone})` : ""}` },
          { label: "ลูกค้า", value: confirm?.lead.name ?? "-" },
          { label: "ราคา", value: baht(unit.price) },
          { label: "สถานะใหม่", value: confirm ? unitStatusOf(confirm.status).label : "-" },
        ]}
        consequence={confirm ? CONSEQUENCE[confirm.status] : undefined}
        confirmLabel={
          confirm?.status === "available" ? `ยืนยันยกเลิกจองแปลง ${unit.code}` : `ยืนยัน${confirmVerb}แปลง ${unit.code}`
        }
      />
    </>
  );
}
