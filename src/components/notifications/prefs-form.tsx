"use client";

import { useActionState } from "react";
import { saveNotificationPrefs } from "@/app/(app)/me/actions";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";
import { MultiSelectSearch } from "@/components/ui/multi-select-search";
import { ToggleRow } from "@/components/ui/toggle";

export type PrefsValues = {
  daily_digest: boolean;
  digest_hour: number;
  instant: boolean;
  quiet_from: number | null;
  quiet_to: number | null;
  project_ids: string[] | null;
};

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00 น.`;

function Toggle({ name, label, hint, defaultChecked }: { name: string; label: string; hint: string; defaultChecked: boolean }) {
  // Sends "on" while switched on, like the checkbox the server action reads.
  return <ToggleRow name={name} title={label} hint={hint} defaultChecked={defaultChecked} />;
}

/** Notification settings: daily summary, instant messages, quiet hours, projects (executives). */
export function PrefsForm({
  values,
  digestHint,
  projects,
}: {
  values: PrefsValues;
  digestHint: string;
  projects?: { id: string; name: string }[]; // executives only
}) {
  const [result, action, pending] = useActionState(saveNotificationPrefs, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <Toggle name="daily_digest" label="สรุปประจำวัน" hint={digestHint} defaultChecked={values.daily_digest} />
      <Field label="เวลาส่งสรุปประจำวัน">
        <Select name="digest_hour" defaultValue={values.digest_hour}>
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {hourLabel(h)}
            </option>
          ))}
        </Select>
      </Field>

      <Toggle
        name="instant"
        label="แจ้งเตือนทันที"
        hint="เช่น ได้ลีดใหม่ นัดชมใกล้ถึงเวลา มีการจอง (ปิดแล้วยังดูได้ในหน้าแจ้งเตือน)"
        defaultChecked={values.instant}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">ช่วงเวลาห้ามรบกวน</legend>
        <p className="text-sm text-ink-soft">ข้อความในช่วงนี้จะส่งให้หลังหมดเวลาห้ามรบกวน</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ตั้งแต่">
            <Select name="quiet_from" defaultValue={values.quiet_from ?? ""}>
              <option value="">ไม่ตั้ง</option>
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="ถึง">
            <Select name="quiet_to" defaultValue={values.quiet_to ?? ""}>
              <option value="">ไม่ตั้ง</option>
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </fieldset>

      {projects && projects.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">โครงการที่รับแจ้งเตือน</span>
          <MultiSelectSearch
            name="project_ids"
            options={projects.map((p) => ({ id: p.id, label: p.name }))}
            defaultValue={values.project_ids ?? []}
            placeholder="ทุกโครงการที่ดูแล"
            searchPlaceholder="ค้นหาโครงการ"
            aria-label="โครงการที่รับแจ้งเตือน"
          />
          <p className="text-sm text-ink-soft">ไม่เลือกเลย = รับทุกโครงการที่ดูแล</p>
        </div>
      )}

      {result && <Notice tone={result.ok ? "ok" : "danger"}>{result.message}</Notice>}
      <Button type="submit" variant="secondary" full disabled={pending}>
        {pending ? "กำลังบันทึก" : "บันทึกการตั้งค่า"}
      </Button>
    </form>
  );
}
