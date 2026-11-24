"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge, Notice } from "@/components/ui/card";
import { Sheet } from "@/components/ui/confirm-card";
import { DateField } from "@/components/ui/date-range-picker";
import { Field, Textarea } from "@/components/ui/field";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { addDaysISO, todayISO } from "@/lib/format";
import { enqueueVisitPhoto, resizePhoto, usePendingUploads } from "@/lib/photo-upload";
import { checkInVisit } from "./visit-check-in-action";

/** "เช็กอินพาชม" on the customer page. Saves the visit at once and closes; the photo is shrunk
 *  and uploaded in the background (kept on the phone until it is sent).
 *  Use: <VisitCheckIn leadId={lead.id} nextFollowUp={lead.next_follow_up} /> */
export function VisitCheckIn({ leadId, nextFollowUp }: { leadId: string; nextFollowUp?: string | null }) {
  const router = useRouter();
  const today = todayISO();
  const defaultNext = nextFollowUp && nextFollowUp > today ? nextFollowUp : addDaysISO(today, 1);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  // Bumped on reset: remounts the dropzone so it forgets the picked photo.
  const [pickKey, setPickKey] = useState(0);
  const photo = useRef<Promise<Blob | null> | null>(null);
  const form = useRef<HTMLFormElement>(null);

  function reset() {
    form.current?.reset();
    setPickKey((k) => k + 1);
    photo.current = null;
    setError("");
  }

  function onPhoto(file: File | null) {
    if (!file) {
      photo.current = null;
      return;
    }
    // Start shrinking now, so it is ready by the time the user taps save.
    photo.current = resizePhoto(file).catch(() => null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const next = String(data.get("next_follow_up") ?? "");
    if (!next) return setError("กรุณาเลือกวันที่ต้องตามครั้งถัดไป");

    setBusy(true);
    setError("");
    const res = await checkInVisit({ leadId, note: String(data.get("note") ?? ""), nextFollowUp: next });
    setBusy(false);
    if (!res.ok) return setError(res.message);

    const pending = photo.current;
    setOpen(false);
    reset();
    setDone(pending ? "บันทึกการพาชมแล้ว กำลังอัปโหลดรูป" : "บันทึกการพาชมแล้ว");
    router.refresh();

    if (pending) {
      const blob = await pending;
      if (blob) await enqueueVisitPhoto({ leadId, activityId: res.activityId, blob });
      else setDone("บันทึกการพาชมแล้ว แต่ย่อรูปไม่สำเร็จ ลองเลือกรูปอื่นแล้วเช็กอินใหม่");
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        icon="checkin"
        onClick={() => {
          setDone("");
          setOpen(true);
        }}
      >
        เช็กอินพาชม
      </Button>
      {done && <Notice>{done}</Notice>}

      <Sheet
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title="เช็กอินพาชมโครงการ"
      >
        <form ref={form} onSubmit={onSubmit} className="flex flex-col gap-4">
          {/* Not inside a <Field> label: a tap on the label would open the picker a second time */}
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">รูปถ่ายตอนพาชม</span>
            <FileDropzone
              key={pickKey}
              name="photo"
              accept="image/*"
              capture="environment"
              onFile={onPhoto}
              prompt="แตะเพื่อถ่ายรูป หรือลากรูปมาวาง"
              hint="ถ่ายใหม่หรือเลือกจากคลัง ระบบย่อรูปให้เอง"
              aria-label="ถ่ายหรือเลือกรูปตอนพาชม"
              renderPreview={(_file, url) =>
                url && (
                  // eslint-disable-next-line @next/next/no-img-element -- local preview (blob: URL)
                  <img src={url} alt="รูปที่เลือก" className="max-h-48 w-full rounded-control object-cover" />
                )
              }
            />
          </div>
          <Field label="บันทึก">
            <Textarea name="note" placeholder="เช่น ลูกค้าสนใจแปลงหัวมุม พาครอบครัวมาด้วย" maxLength={2000} />
          </Field>
          <Field label="ตามครั้งถัดไป" required>
            <DateField name="next_follow_up" defaultValue={defaultNext} minDate={today} ariaLabel="ตามครั้งถัดไป" />
          </Field>
          {error && <Notice tone="danger">{error}</Notice>}
          <Button type="submit" full disabled={busy}>
            {busy ? "กำลังบันทึก" : "บันทึกการพาชม"}
          </Button>
        </form>
      </Sheet>
    </>
  );
}

/** "กำลังอัปโหลดรูป" label for an activity in the timeline while its photo is still uploading.
 *  Use next to <ActivityPhoto>: {a.photo_path ? <ActivityPhoto path={a.photo_path} /> : <PhotoUploading activityId={a.id} />} */
export function PhotoUploading({ activityId }: { activityId: string }) {
  const pending = usePendingUploads();
  if (!pending.includes(activityId)) return null;
  return <Badge tone="warn">กำลังอัปโหลดรูป</Badge>;
}
