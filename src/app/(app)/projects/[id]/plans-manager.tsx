"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { PlanView } from "@/components/plots/types";
import { Button } from "@/components/ui/button";
import { Card, Notice, SectionTitle } from "@/components/ui/card";
import {
  CoverUploadIcon,
  DeleteIcon,
  SitePlanIcon,
  ZoomInIcon,
} from "@/lib/icons";
import { ActionMenu } from "@/components/ui/action-menu";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { ConfirmCard } from "@/components/ui/confirm-card";
import { Input } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";
import { createPlan, deletePlan, setPlanImage } from "../actions";

const MAX_SIDE = 4000; // px; a bigger picture is shrunk before upload
const MAX_BYTES = 10 * 1024 * 1024; // bucket limit (0004_units.sql)
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Read the picture size in the browser and shrink it when the long side is over 4000px
 *  (or the file is over the bucket limit). */
async function prepareImage(
  file: File,
): Promise<{ blob: Blob; width: number; height: number; ext: string }> {
  const bmp = await createImageBitmap(file);
  const { width, height } = bmp;
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const extOf = (t: string) =>
    t === "image/png" ? "png" : t === "image/webp" ? "webp" : "jpg";
  if (scale === 1 && file.size <= MAX_BYTES) {
    bmp.close();
    return { blob: file, width, height, ext: extOf(file.type) };
  }
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  // JPEG keeps a big plan small; plot numbers stay readable at 0.9
  const blob = await new Promise<Blob>((ok, fail) =>
    canvas.toBlob(
      (b) => (b ? ok(b) : fail(new Error("resize failed"))),
      "image/jpeg",
      0.9,
    ),
  );
  return { blob, width: w, height: h, ext: "jpg" };
}

function PlanRow({ projectId, plan }: { projectId: string; plan: PlanView }) {
  const router = useRouter();
  const [status, setStatus] = useState<{
    tone: "ok" | "warn" | "danger";
    text: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [viewing, setViewing] = useState(false);
  // The dropzone shows for a plan without a picture, or after "เปลี่ยนรูปผัง".
  const [replacing, setReplacing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [pickKey, setPickKey] = useState(0);
  const [busy, start] = useTransition();

  const upload = async () => {
    if (!file) return;
    if (!TYPES.includes(file.type)) {
      setStatus({ tone: "danger", text: "ใช้ได้เฉพาะไฟล์ JPG, PNG หรือ WebP" });
      return;
    }
    setUploading(true);
    setStatus({ tone: "warn", text: "กำลังอัปโหลดรูปผัง" });
    try {
      const img = await prepareImage(file);
      if (img.blob.size > MAX_BYTES) throw new Error("too big");
      const path = `${projectId}/${plan.id}-${Date.now()}.${img.ext}`;
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("site-plans")
        .upload(path, img.blob, {
          contentType: img.ext === "jpg" ? "image/jpeg" : `image/${img.ext}`,
          upsert: false,
        });
      if (error) throw error;
      const res = await setPlanImage({
        planId: plan.id,
        path,
        width: img.width,
        height: img.height,
      });
      if (!res.ok) {
        await supabase.storage.from("site-plans").remove([path]);
        throw new Error(res.error);
      }
      setStatus({
        tone: "ok",
        text: `อัปโหลดแล้ว (${img.width} × ${img.height} px)`,
      });
      setFile(null);
      setPickKey((k) => k + 1);
      setReplacing(false);
      router.refresh();
    } catch {
      setStatus({
        tone: "danger",
        text: "อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้ง (ไฟล์ต้องไม่เกิน 10 MB)",
      });
    } finally {
      setUploading(false);
    }
  };

  const remove = () =>
    start(async () => {
      const res = await deletePlan(plan.id);
      setConfirm(false);
      if (!res.ok) setStatus({ tone: "danger", text: res.error });
      else router.refresh();
    });

  const showDropzone = !plan.image_path || replacing;

  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {plan.url && (
            <button
              type="button"
              onClick={() => setViewing(true)}
              aria-label={`ดูรูปผัง ${plan.name} เต็มจอ`}
              className="shrink-0 overflow-hidden rounded-control border border-line"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- signed URL of a private file */}
              <img
                src={plan.url}
                alt={`รูปย่อ ${plan.name}`}
                className="h-16 w-24 object-cover"
              />
            </button>
          )}
          <div className="min-w-0">
            <p className="break-words">{plan.name}</p>
            <p className="text-sm text-ink-soft">
              {plan.image_path
                ? `มีรูปแล้ว${plan.image_w ? ` · ${plan.image_w} × ${plan.image_h} px` : ""}`
                : "ยังไม่มีรูป"}
            </p>
          </div>
        </div>
        <ActionMenu
          label={`ตัวเลือกของผัง ${plan.name}`}
          items={[
            ...(plan.url
              ? [
                  {
                    key: "view",
                    label: "ดูรูปผัง",
                    icon: <ZoomInIcon />,
                    onClick: () => setViewing(true),
                  },
                ]
              : []),
            ...(plan.image_path
              ? [
                  {
                    key: "replace",
                    label: "เปลี่ยนรูปผัง",
                    icon: <CoverUploadIcon />,
                    onClick: () => setReplacing(true),
                  },
                ]
              : []),
            {
              key: "delete",
              label: "ลบผัง",
              icon: <DeleteIcon />,
              danger: true,
              dividerBefore: true,
              onClick: () => setConfirm(true),
            },
          ]}
        />
      </div>
      {status && <Notice tone={status.tone}>{status.text}</Notice>}
      {showDropzone && (
        <div className="flex flex-col gap-2">
          <FileDropzone
            key={pickKey}
            accept={TYPES.join(",")}
            prompt={
              plan.image_path
                ? "ลากรูปผังใหม่มาวาง หรือแตะเพื่อเลือก"
                : "ลากรูปผังมาวาง หรือแตะเพื่อเลือก"
            }
            hint="JPG, PNG หรือ WebP · ด้านยาวเกิน 4000 px ระบบย่อให้"
            disabled={uploading}
            onFile={(f) => {
              setFile(f);
              setStatus(null);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void upload()} disabled={!file || uploading}>
              {uploading
                ? "กำลังอัปโหลด"
                : plan.image_path
                  ? "บันทึกรูปผังใหม่"
                  : "อัปโหลดรูปผัง"}
            </Button>
            {replacing && (
              <Button
                variant="secondary"
                disabled={uploading}
                onClick={() => {
                  setReplacing(false);
                  setFile(null);
                  setPickKey((k) => k + 1);
                }}
              >
                ยกเลิก
              </Button>
            )}
          </div>
        </div>
      )}
      <ImageLightbox
        src={viewing ? plan.url : null}
        alt={`ผัง ${plan.name}`}
        onClose={() => setViewing(false)}
      />
      <ConfirmCard
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={remove}
        busy={busy}
        danger
        title={`ลบผัง ${plan.name}`}
        rows={[
          { label: "ผัง", value: plan.name },
          { label: "รูป", value: plan.image_path ? "ลบรูปด้วย" : "ไม่มีรูป" },
        ]}
        consequence="หมุดของแปลงบนผังนี้จะหายทั้งหมด ข้อมูลแปลงและสถานะยังอยู่ครบ ต้องอัปโหลดรูปและปักหมุดใหม่ถ้าต้องการกลับมา"
        confirmLabel={`ยืนยันลบผัง ${plan.name}`}
      />
    </li>
  );
}

/** Admin: add a plan per zone or phase, upload or replace its picture, delete it. */
export function PlansManager({
  projectId,
  plans,
}: {
  projectId: string;
  plans: PlanView[];
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, start] = useTransition();

  const add = () =>
    start(async () => {
      setError("");
      const res = await createPlan(
        projectId,
        name || (plans.length ? `โซน ${plans.length + 1}` : "ผังโครงการ"),
      );
      if (res.ok) setName("");
      else setError(res.error);
    });

  return (
    <Card className="flex flex-col gap-3">
      <SectionTitle
        icon={SitePlanIcon}
        tone="ok"
        title="ผังโครงการ"
        sub="โครงการใหญ่แยกผังตามโซนหรือเฟสได้ รูปที่ด้านยาวเกิน 4000 px ระบบย่อให้ก่อนอัปโหลด"
      />
      {plans.length > 0 && (
        <ul className="flex flex-col divide-y divide-line">
          {plans.map((p) => (
            <PlanRow key={p.id} projectId={projectId} plan={p} />
          ))}
        </ul>
      )}
      {error && <Notice tone="danger">{error}</Notice>}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <Input
          aria-label="ชื่อผังใหม่"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={plans.length ? "ชื่อผัง เช่น โซน B" : "ชื่อผัง เช่น ผังโครงการ"}
        />
        <Button
          type="submit"
          variant="secondary"
          disabled={busy}
          icon="add"
          className="shrink-0"
        >
          {busy ? "กำลังเพิ่ม" : "เพิ่มผัง"}
        </Button>
      </form>
    </Card>
  );
}
