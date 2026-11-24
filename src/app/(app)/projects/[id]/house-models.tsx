"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { HouseModelPicture } from "@/components/projects/house-model-picture";
import type { HouseModel } from "@/components/projects/load";
import { ActionMenu } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import {
  Badge,
  Card,
  EmptyState,
  Notice,
  SectionTitle,
} from "@/components/ui/card";
import { ConfirmCard, Sheet } from "@/components/ui/confirm-card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import {
  HOUSE_CATEGORIES,
  houseCategoryOf,
  type HouseCategory,
} from "@/config/houses";
import { baht, num } from "@/lib/format";
import {
  BathroomIcon,
  BedroomIcon,
  DeleteIcon,
  EditIcon,
  FreePlotIcon,
  HouseModelIcon,
  LandAreaIcon,
  ParkingIcon,
  UsableAreaIcon,
  ZoomInIcon,
} from "@/lib/icons";
import { resizePhoto } from "@/lib/photo-upload";
import { createClient } from "@/lib/supabase/client";
import {
  createHouseModel,
  deleteHouseModel,
  setHouseModelImage,
  updateHouseModel,
  type HouseModelInput,
} from "../actions";

const BUCKET = "project-images"; // 0007_project_images.sql; models live in <project_id>/models/

/** Free (available + interested) and total plots of each model, keyed by model id. */
export type ModelCounts = Record<string, { free: number; total: number }>;

/** "แบบบ้าน" section of the project page: model cards for everyone, add / edit / delete for the admin. */
export function HouseModels({
  projectId,
  models,
  counts,
  isAdmin,
}: {
  projectId: string;
  models: HouseModel[];
  counts: ModelCounts;
  isAdmin: boolean;
}) {
  // Full-screen gallery of every model that has a picture, captioned with its name.
  const pictured = models.filter((m) => m.image_url);
  const [viewing, setViewing] = useState<number | null>(null);
  const gallery = pictured.map((m) => ({
    src: m.image_url!,
    caption: `แบบ ${m.name} · ${houseCategoryOf(m.category).label}${m.price_from === null ? "" : ` · เริ่ม ${baht(m.price_from)}`}`,
  }));

  return (
    <Card className="flex flex-col gap-4">
      <SectionTitle
        icon={HouseModelIcon}
        title="แบบบ้าน"
        sub={
          models.length
            ? `${num(models.length)} แบบในโครงการนี้`
            : "แบบบ้านที่ขายในโครงการนี้"
        }
        action={
          isAdmin && models.length > 0 ? (
            <ModelFormButton projectId={projectId} label="เพิ่มแบบบ้าน" />
          ) : undefined
        }
      />
      {models.length === 0 ? (
        <EmptyState
          icon={HouseModelIcon}
          title="ยังไม่มีแบบบ้าน"
          hint={
            isAdmin
              ? 'เพิ่มแบบบ้าน ใส่ประเภท จำนวนห้อง ราคาเริ่มต้น และรูป แปลงที่ช่อง "แบบบ้าน" มีชื่อแบบนี้จะผูกกับแบบให้เอง'
              : "ให้แอดมินเพิ่มแบบบ้านของโครงการนี้"
          }
          action={
            isAdmin ? (
              <ModelFormButton projectId={projectId} label="เพิ่มแบบบ้าน" />
            ) : undefined
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {models.map((m) => (
            <ModelCard
              key={m.id}
              projectId={projectId}
              model={m}
              count={counts[m.id] ?? { free: 0, total: 0 }}
              isAdmin={isAdmin}
              onView={
                m.image_url ? () => setViewing(pictured.indexOf(m)) : undefined
              }
            />
          ))}
        </ul>
      )}
      <ImageLightbox
        images={viewing === null ? null : gallery}
        initialIndex={viewing ?? 0}
        onClose={() => setViewing(null)}
      />
    </Card>
  );
}

function ModelCard({
  projectId,
  model: m,
  count,
  isAdmin,
  onView,
}: {
  projectId: string;
  model: HouseModel;
  count: { free: number; total: number };
  isAdmin: boolean;
  /** Open the picture full screen (only when the model has one). */
  onView?: () => void;
}) {
  const cat = houseCategoryOf(m.category);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const rooms: { icon: ReactNode; value: number | null; label: string }[] = [
    {
      icon: <BedroomIcon aria-hidden className="h-4 w-4" />,
      value: m.bedrooms,
      label: "ห้องนอน",
    },
    {
      icon: <BathroomIcon aria-hidden className="h-4 w-4" />,
      value: m.bathrooms,
      label: "ห้องน้ำ",
    },
    {
      icon: <ParkingIcon aria-hidden className="h-4 w-4" />,
      value: m.parking,
      label: "ที่จอดรถ",
    },
  ];

  return (
    <li className="flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <div className="relative aspect-video w-full overflow-hidden bg-bg">
        {onView ? (
          <button
            type="button"
            onClick={onView}
            aria-label={`ดูรูปแบบ ${m.name} เต็มจอ`}
            className="block h-full w-full cursor-zoom-in"
          >
            <HouseModelPicture url={m.image_url} name={m.name} />
          </button>
        ) : (
          <HouseModelPicture url={m.image_url} name={m.name} />
        )}
        <span className="pointer-events-none absolute top-2 left-2">
          <Badge tone={cat.tone}>{cat.label}</Badge>
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold">แบบ {m.name}</h3>
            <p className="font-semibold text-brand">
              {m.price_from === null
                ? "ยังไม่ระบุราคา"
                : `เริ่ม ${baht(m.price_from)}`}
            </p>
          </div>
          {isAdmin && (
            <ActionMenu
              label={`ตัวเลือกของแบบ ${m.name}`}
              items={[
                ...(onView
                  ? [
                      {
                        key: "view",
                        label: "ดูรูป",
                        icon: <ZoomInIcon />,
                        onClick: onView,
                      },
                    ]
                  : []),
                {
                  key: "edit",
                  label: "แก้ไข",
                  icon: <EditIcon />,
                  onClick: () => setEditing(true),
                },
                {
                  key: "delete",
                  label: "ลบแบบนี้",
                  icon: <DeleteIcon />,
                  danger: true,
                  dividerBefore: true,
                  onClick: () => setDeleting(true),
                },
              ]}
            />
          )}
        </div>

        <ul className="grid grid-cols-3 gap-2 text-sm">
          {rooms.map((r) => (
            <li
              key={r.label}
              className="flex flex-col gap-0.5 rounded-control bg-bg px-2 py-1.5"
              aria-label={`${r.label} ${r.value === null ? "ไม่ระบุ" : num(r.value)}`}
            >
              <span className="flex items-center gap-1 text-xs text-ink-soft">
                {r.icon}
                {r.label}
              </span>
              <span className="font-semibold text-ink">
                {r.value === null ? "-" : num(r.value)}
              </span>
            </li>
          ))}
        </ul>

        <ul className="flex flex-col gap-1 text-ink-soft">
          <li className="flex items-center gap-2">
            <UsableAreaIcon aria-hidden className="h-4 w-4 shrink-0" />
            พื้นที่ใช้สอย{" "}
            {m.usable_sqm === null ? "-" : `${num(m.usable_sqm)} ตร.ม.`}
          </li>
          <li className="flex items-center gap-2">
            <LandAreaIcon aria-hidden className="h-4 w-4 shrink-0" />
            ที่ดิน{" "}
            {m.land_from_sqw === null
              ? "-"
              : `เริ่ม ${num(m.land_from_sqw)} ตร.ว.`}
          </li>
          <li className="flex items-center gap-2">
            <FreePlotIcon aria-hidden className="h-4 w-4 shrink-0" />
            {count.total === 0
              ? "ยังไม่มีแปลงแบบนี้"
              : `ว่าง ${num(count.free)} จาก ${num(count.total)} แปลง`}
          </li>
        </ul>

        {m.description && (
          <p className="line-clamp-2 text-ink-soft">{m.description}</p>
        )}

        {isAdmin && (
          <>
            <ModelFormSheet
              projectId={projectId}
              model={m}
              open={editing}
              onClose={() => setEditing(false)}
            />
            <DeleteModelConfirm
              model={m}
              count={count}
              open={deleting}
              onClose={() => setDeleting(false)}
            />
          </>
        )}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------
// Admin: add / edit / delete
// ---------------------------------------------------------------
type Form = {
  name: string;
  category: HouseCategory;
  bedrooms: string;
  bathrooms: string;
  parking: string;
  usable_sqm: string;
  land_from_sqw: string;
  price_from: string;
  description: string;
};

const str = (n: number | null) => (n === null ? "" : String(n));
const formOf = (m?: HouseModel): Form => ({
  name: m?.name ?? "",
  category: m?.category ?? "detached",
  bedrooms: str(m?.bedrooms ?? null),
  bathrooms: str(m?.bathrooms ?? null),
  parking: str(m?.parking ?? null),
  usable_sqm: str(m?.usable_sqm ?? null),
  land_from_sqw: str(m?.land_from_sqw ?? null),
  price_from: str(m?.price_from ?? null),
  description: m?.description ?? "",
});
const numOf = (s: string) => {
  const t = s.replace(/,/g, "").trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};
const inputOf = (f: Form): HouseModelInput => ({
  name: f.name,
  category: f.category,
  bedrooms: numOf(f.bedrooms),
  bathrooms: numOf(f.bathrooms),
  parking: numOf(f.parking),
  usable_sqm: numOf(f.usable_sqm),
  land_from_sqw: numOf(f.land_from_sqw),
  price_from: numOf(f.price_from),
  description: f.description,
});

/** Shrink to 1600px JPEG in the browser, upload to <project_id>/models/<model_id>-<ts>.jpg, then save it on the model. */
async function uploadModelImage(
  projectId: string,
  modelId: string,
  file: File,
): Promise<boolean> {
  try {
    const blob = await resizePhoto(file);
    const path = `${projectId}/models/${modelId}-${Date.now()}.jpg`;
    const supabase = createClient();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: "image/jpeg", upsert: false });
    if (error) return false;
    const res = await setHouseModelImage(modelId, path);
    if (!res.ok) {
      await supabase.storage.from(BUCKET).remove([path]);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** "เพิ่มแบบบ้าน" button that opens the form (admin). */
function ModelFormButton({
  projectId,
  label,
}: {
  projectId: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button icon="add" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <ModelFormSheet
        projectId={projectId}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

/** Add or edit a house model in a bottom sheet (admin). Without `model` it adds a new one. */
function ModelFormSheet({
  projectId,
  model,
  open,
  onClose,
}: {
  projectId: string;
  model?: HouseModel;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={model ? `แก้ไขแบบ ${model.name}` : "เพิ่มแบบบ้าน"}
    >
      {/* The form lives inside the sheet: it starts fresh every time the sheet opens. */}
      <ModelForm projectId={projectId} model={model} onDone={onClose} />
    </Sheet>
  );
}

function ModelForm({
  projectId,
  model,
  onDone,
}: {
  projectId: string;
  model?: HouseModel;
  onDone: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(formOf(model));
  const [file, setFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [dropKey, setDropKey] = useState(0);
  // a new model that saved but whose picture failed: the next save edits it instead of adding another
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, start] = useTransition();

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = () =>
    start(async () => {
      setError("");
      const editId = model?.id ?? createdId;
      let id: string;
      if (editId) {
        const res = await updateHouseModel(editId, inputOf(form));
        if (!res.ok) return setError(res.error);
        id = editId;
      } else {
        const res = await createHouseModel(projectId, inputOf(form));
        if (!res.ok) return setError(res.error);
        id = res.id;
        setCreatedId(id);
      }

      if (file) {
        if (!(await uploadModelImage(projectId, id, file))) {
          return setError(
            "บันทึกแบบบ้านแล้ว แต่อัปโหลดรูปไม่สำเร็จ ลองเลือกรูปใหม่แล้วกดบันทึกอีกครั้ง (ไฟล์ JPG, PNG หรือ WebP)",
          );
        }
      } else if (removeImage && model?.image_path) {
        const res = await setHouseModelImage(id, null);
        if (!res.ok) return setError(res.error);
      }

      onDone();
      router.refresh();
    });

  const hasImage = !!file || (!!model?.image_path && !removeImage);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      {error && <Notice tone="danger">{error}</Notice>}
      <Field
        label="ชื่อแบบ"
        required
        hint='ใช้คำเดียวกับช่อง "แบบบ้าน" ในไฟล์แปลง เช่น Ivy แปลงจะผูกกับแบบให้เอง'
      >
        <Input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          required
          placeholder="เช่น Ivy"
        />
      </Field>
      <Field label="ประเภทบ้าน" required>
        <Select
          value={form.category}
          onChange={(e) => set("category", e.target.value as HouseCategory)}
        >
          {HOUSE_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="ห้องนอน">
          <Input
            inputMode="numeric"
            value={form.bedrooms}
            onChange={(e) => set("bedrooms", e.target.value)}
          />
        </Field>
        <Field label="ห้องน้ำ">
          <Input
            inputMode="numeric"
            value={form.bathrooms}
            onChange={(e) => set("bathrooms", e.target.value)}
          />
        </Field>
        <Field label="ที่จอดรถ">
          <Input
            inputMode="numeric"
            value={form.parking}
            onChange={(e) => set("parking", e.target.value)}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="พื้นที่ใช้สอย (ตร.ม.)">
          <Input
            inputMode="decimal"
            value={form.usable_sqm}
            onChange={(e) => set("usable_sqm", e.target.value)}
          />
        </Field>
        <Field label="ที่ดินเริ่ม (ตร.ว.)">
          <Input
            inputMode="decimal"
            value={form.land_from_sqw}
            onChange={(e) => set("land_from_sqw", e.target.value)}
          />
        </Field>
      </div>
      <Field label="ราคาเริ่มต้น (บาท)">
        <Input
          inputMode="numeric"
          value={form.price_from}
          onChange={(e) => set("price_from", e.target.value)}
          placeholder="เช่น 4540000"
        />
      </Field>
      <Field label="รายละเอียด" hint="สั้น ๆ 1–2 บรรทัด แสดงบนการ์ดแบบบ้าน">
        <Textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">รูปแบบบ้าน</p>
        <FileDropzone
          key={dropKey}
          accept="image/jpeg,image/png,image/webp"
          maxSizeMB={20}
          prompt={
            hasImage
              ? "ลากรูปใหม่มาวาง หรือแตะเพื่อเลือก"
              : "ลากรูปแบบบ้านมาวาง หรือแตะเพื่อเลือก"
          }
          hint="JPG, PNG หรือ WebP · รูปแนวนอนดูสวยที่สุด ระบบย่อรูปให้ก่อนอัปโหลด"
          disabled={busy}
          currentUrl={removeImage ? null : (model?.image_url ?? null)}
          currentLabel="รูปปัจจุบัน"
          onFile={(f) => {
            setFile(f);
            if (f) setRemoveImage(false);
          }}
          renderPreview={(f, url) => (
            <div className="aspect-video w-full overflow-hidden rounded-card border border-line">
              <HouseModelPicture url={url} name={form.name || f.name} />
            </div>
          )}
        />
        {hasImage && (
          <div>
            <Button
              variant="ghost"
              className="text-danger"
              icon="remove"
              disabled={busy}
              onClick={() => {
                setFile(null);
                setRemoveImage(true);
                setDropKey((k) => k + 1);
              }}
            >
              เอารูปออก
            </Button>
          </div>
        )}
      </div>

      <Button type="submit" full disabled={busy || !form.name.trim()}>
        {busy ? "กำลังบันทึก" : model || createdId ? "บันทึกแบบบ้าน" : "เพิ่มแบบบ้าน"}
      </Button>
    </form>
  );
}

function DeleteModelConfirm({
  model,
  count,
  open,
  onClose,
}: {
  model: HouseModel;
  count: { free: number; total: number };
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, start] = useTransition();

  const run = () =>
    start(async () => {
      const res = await deleteHouseModel(model.id);
      if (!res.ok) {
        setError(res.error);
        onClose();
        return;
      }
      onClose();
      router.refresh();
    });

  return (
    <>
      {error && <Notice tone="danger">{error}</Notice>}
      <ConfirmCard
        open={open}
        onClose={onClose}
        onConfirm={run}
        busy={busy}
        danger
        title={`ลบแบบ ${model.name}`}
        rows={[
          { label: "แบบบ้าน", value: model.name },
          { label: "ประเภท", value: houseCategoryOf(model.category).label },
          { label: "แปลงที่ใช้แบบนี้", value: `${num(count.total)} แปลง` },
        ]}
        consequence="แบบบ้านและรูปจะถูกลบถาวร แปลงที่ใช้แบบนี้ยังอยู่ครบ แต่จะไม่ผูกกับแบบนี้อีก"
        confirmLabel={`ยืนยันลบแบบ ${model.name}`}
      />
    </>
  );
}
