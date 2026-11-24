"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ProjectCover } from "@/components/projects/project-cover";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { Sheet } from "@/components/ui/confirm-card";
import { Field, Input } from "@/components/ui/field";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { ToggleRow } from "@/components/ui/toggle";
import { resizePhoto } from "@/lib/photo-upload";
import { createClient } from "@/lib/supabase/client";
import {
  createProject,
  setProjectCover,
  updateProject,
  type ProjectInput,
} from "./actions";

export type ProjectRow = ProjectInput & {
  id: string;
  cover_path?: string | null;
  cover_url?: string | null;
};

const EMPTY: ProjectInput = {
  name: "",
  location: "",
  fb_page: "",
  is_open: true,
};
const COVER_BUCKET = "project-images"; // 0007_project_images.sql

const formOf = (p?: ProjectRow): ProjectInput =>
  p
    ? {
        name: p.name,
        location: p.location,
        fb_page: p.fb_page,
        is_open: p.is_open,
      }
    : EMPTY;

/** Shrink to 1600px JPEG in the browser, upload to <project_id>/cover-<ts>.jpg, then save it on the project. */
async function uploadCover(projectId: string, file: File): Promise<boolean> {
  try {
    const blob = await resizePhoto(file);
    const path = `${projectId}/cover-${Date.now()}.jpg`;
    const supabase = createClient();
    const { error } = await supabase.storage
      .from(COVER_BUCKET)
      .upload(path, blob, { contentType: "image/jpeg", upsert: false });
    if (error) return false;
    const res = await setProjectCover(projectId, path);
    if (!res.ok) {
      await supabase.storage.from(COVER_BUCKET).remove([path]);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Add or edit a project in a bottom sheet (admin). Without `project` it adds a new one. */
export function ProjectFormButton({
  project,
  label,
}: {
  project?: ProjectRow;
  label: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProjectInput>(formOf(project));
  const [file, setFile] = useState<File | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  // a new project that saved but whose cover failed: the next save edits it instead of adding another
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, start] = useTransition();

  const set = <K extends keyof ProjectInput>(k: K, v: ProjectInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // New key = empty dropzone (after "เอารูปปกออก" or closing the sheet).
  const [dropKey, setDropKey] = useState(0);

  const reset = () => {
    setFile(null);
    setDropKey((k) => k + 1);
    setRemoveCover(false);
    setCreatedId(null);
    setError("");
  };

  const close = () => {
    setOpen(false);
    reset();
    setForm(formOf(project));
  };

  const save = () =>
    start(async () => {
      setError("");
      const editId = project?.id ?? createdId;
      let id: string;
      if (editId) {
        const res = await updateProject(editId, form);
        if (!res.ok) return setError(res.error);
        id = editId;
      } else {
        const res = await createProject(form);
        if (!res.ok) return setError(res.error);
        id = res.id;
        setCreatedId(id);
      }

      if (file) {
        if (!(await uploadCover(id, file))) {
          return setError(
            "บันทึกโครงการแล้ว แต่อัปโหลดรูปปกไม่สำเร็จ ลองเลือกรูปใหม่แล้วกดบันทึกอีกครั้ง (ไฟล์ JPG, PNG หรือ WebP)",
          );
        }
      } else if (removeCover && project?.cover_path) {
        const res = await setProjectCover(id, null);
        if (!res.ok) return setError(res.error);
      }

      setOpen(false);
      reset();
      if (project) {
        router.refresh();
      } else {
        setForm(EMPTY);
        router.push(`/projects/${id}`);
      }
    });

  const hasCover = !!file || (!!project?.cover_path && !removeCover);

  return (
    <>
      <Button
        variant={project ? "secondary" : "primary"}
        icon={project ? "edit" : "add"}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
      <Sheet
        open={open}
        onClose={close}
        title={project ? `แก้ไข ${project.name}` : "เพิ่มโครงการ"}
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          {error && <Notice tone="danger">{error}</Notice>}
          <Field label="ชื่อโครงการ" required>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </Field>
          <Field label="ที่ตั้ง">
            <Input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="เช่น บางนา กม.12"
            />
          </Field>
          <Field label="เพจ Facebook" hint="ลิงก์เพจของโครงการ ไม่บังคับ">
            <Input
              value={form.fb_page}
              onChange={(e) => set("fb_page", e.target.value)}
              inputMode="url"
              placeholder="https://facebook.com/..."
            />
          </Field>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">รูปปกโครงการ</p>
            <FileDropzone
              key={dropKey}
              accept="image/jpeg,image/png,image/webp"
              maxSizeMB={20}
              prompt={
                hasCover
                  ? "ลากรูปปกใหม่มาวาง หรือแตะเพื่อเลือก"
                  : "ลากรูปปกมาวาง หรือแตะเพื่อเลือก"
              }
              hint="JPG, PNG หรือ WebP · รูปแนวนอนดูสวยที่สุด ระบบย่อรูปให้ก่อนอัปโหลด"
              disabled={busy}
              currentUrl={removeCover ? null : (project?.cover_url ?? null)}
              currentLabel="รูปปกปัจจุบัน"
              onFile={(f) => {
                setFile(f);
                if (f) setRemoveCover(false);
              }}
              renderPreview={(f, url) => (
                <div className="aspect-video w-full overflow-hidden rounded-card border border-line">
                  <ProjectCover url={url} name={form.name || f.name} />
                </div>
              )}
            />
            {hasCover && (
              <div>
                <Button
                  variant="ghost"
                  className="text-danger"
                  icon="remove"
                  disabled={busy}
                  onClick={() => {
                    setFile(null);
                    setRemoveCover(true);
                    setDropKey((k) => k + 1);
                  }}
                >
                  เอารูปปกออก
                </Button>
              </div>
            )}
          </div>

          <ToggleRow
            title="เปิดขายอยู่"
            hint="ปิดเมื่อโครงการปิดการขาย"
            checked={form.is_open}
            onChange={(v) => set("is_open", v)}
          />
          <Button type="submit" full disabled={busy || !form.name.trim()}>
            {busy
              ? "กำลังบันทึก"
              : project || createdId
                ? "บันทึกโครงการ"
                : "เพิ่มโครงการ"}
          </Button>
        </form>
      </Sheet>
    </>
  );
}
