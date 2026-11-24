"use client";

import { useState } from "react";
import { addCampaign, updateCampaign } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Badge, Card, Notice, SectionTitle } from "@/components/ui/card";
import { CampaignIcon } from "@/lib/icons";
import { Field, Input } from "@/components/ui/field";
import { FormSelect } from "@/components/ui/form-select";
import { Toggle } from "@/components/ui/toggle";
import { useSave } from "./use-save";

export type Campaign = {
  id: string;
  name: string;
  project_id: string | null;
  is_active: boolean;
};
export type ProjectOption = { id: string; name: string };

function ProjectSelect({
  projects,
  value,
  onChange,
}: {
  projects: ProjectOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <FormSelect
      options={projects.map((p) => ({ id: p.id, label: p.name }))}
      value={value}
      onChange={onChange}
      clearLabel="ทุกโครงการ"
      searchPlaceholder="ค้นหาโครงการ"
      aria-label="โครงการของแคมเปญ"
    />
  );
}

function CampaignRow({
  c,
  projects,
}: {
  c: Campaign;
  projects: ProjectOption[];
}) {
  const [name, setName] = useState(c.name);
  const [projectId, setProjectId] = useState(c.project_id ?? "");
  const { result, busy, run } = useSave();
  const changed = name.trim() !== c.name || projectId !== (c.project_id ?? "");

  const save = (isActive: boolean) =>
    run(() =>
      updateCampaign({
        id: c.id,
        name,
        projectId: projectId || null,
        isActive,
      }),
    );

  return (
    <li className="flex flex-col gap-2 border-b border-line pb-3">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 break-words">{c.name}</span>
        <span className="flex items-center gap-1">
          {c.is_active ? <Badge tone="ok">ใช้อยู่</Badge> : <Badge>ปิดแล้ว</Badge>}
          <Toggle
            checked={c.is_active}
            loading={busy}
            onChange={(v) => save(v)}
            aria-label={
              c.is_active ? `ปิดแคมเปญ ${c.name}` : `เปิดใช้แคมเปญ ${c.name} อีกครั้ง`
            }
          />
        </span>
      </div>
      {result && !result.ok && <Notice tone="danger">{result.message}</Notice>}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <Input
          aria-label={`ชื่อแคมเปญ ${c.name}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <ProjectSelect
          projects={projects}
          value={projectId}
          onChange={setProjectId}
        />
      </div>
      {changed && (
        <div className="flex justify-end">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => save(c.is_active)}
          >
            บันทึกการแก้ไข
          </Button>
        </div>
      )}
    </li>
  );
}

/** Campaign list the sales person picks from when adding a lead. Closed campaigns stay on old leads. */
export function CampaignsForm({
  campaigns,
  projects,
}: {
  campaigns: Campaign[];
  projects: ProjectOption[];
}) {
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState("");
  const { result, busy, run } = useSave();

  return (
    <Card className="flex flex-col gap-3">
      <SectionTitle
        icon={CampaignIcon}
        tone="purple"
        title="แคมเปญ"
        sub="ที่มาของลีด เช่น ชื่อแอดใน Facebook ลีดจากเว็บที่ส่งชื่อแคมเปญใหม่มา ระบบเพิ่มให้เอง"
      />
      {result && (
        <Notice tone={result.ok ? "ok" : "danger"}>{result.message}</Notice>
      )}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <Field label="ชื่อแคมเปญใหม่">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="โครงการ">
          <ProjectSelect
            projects={projects}
            value={projectId}
            onChange={setProjectId}
          />
        </Field>
      </div>
      <Button
        full
        icon="add"
        disabled={!name.trim() || busy}
        onClick={() =>
          run(
            () => addCampaign({ name, projectId: projectId || null }),
            (r) => r.ok && setName(""),
          )
        }
      >
        {busy ? "กำลังเพิ่ม" : "เพิ่มแคมเปญ"}
      </Button>
      {campaigns.length === 0 ? (
        <p className="text-sm text-ink-soft">ยังไม่มีแคมเปญ</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {campaigns.map((c) => (
            <CampaignRow
              key={`${c.id}-${c.name}-${c.project_id}-${c.is_active}`}
              c={c}
              projects={projects}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
