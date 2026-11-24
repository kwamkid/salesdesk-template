"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { PlanView } from "@/components/plots/types";
import { Card, Notice, SectionTitle } from "@/components/ui/card";
import { PinImportIcon } from "@/lib/icons";
import { ConfirmCard } from "@/components/ui/confirm-card";
import { Field, Select } from "@/components/ui/field";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { importPins, type PinImportResult, type PinInput } from "../actions";

type Parsed = { pins: PinInput[]; skipped: number; fileName: string };

/** Read pins.json from Claude Code. Accepts { width, height, pins: [...] } or a bare array.
 *  Each pin: { plot (or code), x, y } as fractions 0..1. Pixel values are turned into
 *  fractions when the file gives width and height. */
function parsePins(text: string, fileName: string): Parsed {
  const json: unknown = JSON.parse(text);
  const obj = (Array.isArray(json) ? { pins: json } : json) as { pins?: unknown; width?: unknown; height?: unknown };
  if (!obj || !Array.isArray(obj.pins)) throw new Error("no pins");
  const w = Number(obj.width) || 0;
  const h = Number(obj.height) || 0;
  const pins: PinInput[] = [];
  let skipped = 0;
  for (const raw of obj.pins as Record<string, unknown>[]) {
    const plot = String(raw?.plot ?? raw?.code ?? "").trim().toUpperCase();
    let x = Number(raw?.x);
    let y = Number(raw?.y);
    if (w && h && (x > 1 || y > 1)) {
      x /= w;
      y /= h;
    }
    if (!plot || !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) {
      skipped++;
      continue;
    }
    pins.push({ plot, x, y });
  }
  return { pins, skipped, fileName };
}

/** Admin: "นำเข้าตำแหน่งแปลง" — upload pins.json and place every plot on the chosen plan. */
export function PinImport({ plans }: { plans: PlanView[] }) {
  const router = useRouter();
  const withPicture = plans.filter((p) => p.image_path);
  const [planId, setPlanId] = useState(withPicture[0]?.id ?? "");
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PinImportResult | null>(null);
  const [busy, start] = useTransition();
  // New key = empty dropzone again (after an import, a cancel or a file that could not be read).
  const [pickKey, setPickKey] = useState(0);
  const resetPick = () => setPickKey((k) => k + 1);

  const plan = plans.find((p) => p.id === planId);

  const read = async (file: File | undefined) => {
    setError("");
    setResult(null);
    if (!file) return;
    try {
      const p = parsePins(await file.text(), file.name);
      if (p.pins.length === 0) throw new Error("empty");
      setParsed(p);
    } catch {
      setError("อ่านไฟล์ไม่ได้ ต้องเป็นไฟล์ pins.json ที่มีรายการ plot, x, y");
      resetPick();
    }
  };

  const run = () =>
    start(async () => {
      if (!parsed || !planId) return;
      const res = await importPins(planId, parsed.pins);
      setParsed(null);
      resetPick();
      if (!res.ok) return setError(res.error);
      setResult(res.result);
      router.refresh();
    });

  return (
    <Card className="flex flex-col gap-3">
      <SectionTitle
        icon={PinImportIcon}
        tone="purple"
        title="นำเข้าตำแหน่งแปลง"
        sub="ใช้ไฟล์ pins.json ที่ Claude Code อ่านจากรูปผัง หมุดของแปลงที่มีอยู่แล้วจะถูกย้ายตามไฟล์ ตรวจและแก้ต่อได้ในโหมดแก้หมุด"
      />
      {withPicture.length === 0 ? (
        <Notice tone="warn">อัปโหลดรูปผังก่อน แล้วค่อยนำเข้าตำแหน่ง</Notice>
      ) : (
        <>
          {withPicture.length > 1 && (
            <Field label="ผังที่จะวางหมุด">
              <Select value={planId} onChange={(e) => setPlanId(e.target.value)}>
                {withPicture.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <FileDropzone
            key={pickKey}
            accept="application/json,.json"
            maxSizeMB={5}
            prompt="ลากไฟล์ pins.json มาวาง หรือแตะเพื่อเลือก"
            hint="ไฟล์ JSON ที่มีรายการ plot, x, y"
            onFile={(f) => f && void read(f)}
          />
        </>
      )}
      {error && <Notice tone="danger">{error}</Notice>}
      {result && (
        <div className="flex flex-col gap-2">
          <Notice tone="ok">วางหมุดแล้ว {result.placed} แปลง</Notice>
          {result.missing_in_list.length > 0 && (
            <Notice tone="warn">
              เลขในไฟล์ที่ไม่มีในรายการแปลง ({result.missing_in_list.length}): {result.missing_in_list.join(", ")}
            </Notice>
          )}
          {result.without_pin.length > 0 && (
            <Notice tone="warn">
              แปลงที่ยังไม่มีหมุด ({result.without_pin.length}): {result.without_pin.join(", ")} — แตะวางเองได้ในโหมดแก้หมุด
            </Notice>
          )}
        </div>
      )}
      <ConfirmCard
        open={!!parsed}
        onClose={() => {
          setParsed(null);
          resetPick();
        }}
        onConfirm={run}
        busy={busy}
        title="นำเข้าตำแหน่งแปลง"
        rows={[
          { label: "ไฟล์", value: parsed?.fileName ?? "-" },
          { label: "ผัง", value: plan?.name ?? "-" },
          { label: "จำนวนหมุดในไฟล์", value: `${parsed?.pins.length ?? 0} หมุด` },
          ...(parsed?.skipped ? [{ label: "ข้ามเพราะข้อมูลไม่ครบ", value: `${parsed.skipped} รายการ` }] : []),
        ]}
        consequence="แปลงที่เลขตรงกับไฟล์จะย้ายหมุดไปอยู่บนผังนี้ตามตำแหน่งในไฟล์ หมุดเดิมของแปลงนั้นถูกแทนที่"
        confirmLabel={`ยืนยันนำเข้า ${parsed?.pins.length ?? 0} หมุด`}
      />
    </Card>
  );
}
