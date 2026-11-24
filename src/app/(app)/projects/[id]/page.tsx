import Link from "next/link";
import { notFound } from "next/navigation";
import { loadBoard, loadPlans } from "@/components/plots/load";
import { PinEditor } from "@/components/plots/pin-editor";
import { StatusSummary } from "@/components/plots/status-summary";
import { isFree } from "@/components/plots/types";
import { loadCoverUrls, loadHouseModels } from "@/components/projects/load";
import { ZoomableCover } from "@/components/projects/zoomable-cover";
import { buttonClass } from "@/components/ui/button";
import { Badge, Card, SectionTitle, StatTile } from "@/components/ui/card";
import { requireMe } from "@/lib/auth";
import { baht, num } from "@/lib/format";
import { FreePlotIcon, LocationIcon, PlotsIcon, SoldIcon, ValueIcon } from "@/lib/icons";
import { createClient } from "@/lib/supabase/server";
import { ProjectFormButton, type ProjectRow } from "../project-forms";
import { HouseModels, type ModelCounts } from "./house-models";
import { PinImport } from "./pin-import";
import { PlansManager } from "./plans-manager";
import { EVENT_STAGES } from "./event-stages";
import { StageSettingsForm } from "./stage-settings-form";

export const metadata = { title: "โครงการ" };

const editorKey = (plans: { id: string; image_path: string | null }[], units: { updated_at: string }[]) =>
  `${plans.map((p) => `${p.id}:${p.image_path}`).join("|")}#${units.reduce((m, u) => (u.updated_at > m ? u.updated_at : m), "")}`;

/** One project: plot summary and links for everyone; stage values, site plans and pins for the admin. */
export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireMe();
  const isAdmin = me.role === "admin";
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, location, fb_page, is_open, cover_path")
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound(); // also when Row Level Security hides it

  const [units, plans, settings, coverUrls, models] = await Promise.all([
    loadBoard(supabase, id),
    isAdmin ? loadPlans(supabase, id) : Promise.resolve([]),
    isAdmin
      ? supabase.from("stage_settings").select("stage, value, send_event, event_name").eq("project_id", id).in("stage", EVENT_STAGES)
      : Promise.resolve({ data: [] }),
    loadCoverUrls(supabase, [project.cover_path as string | null]),
    loadHouseModels(supabase, id),
  ]);
  const p: ProjectRow = { ...(project as ProjectRow), cover_url: project.cover_path ? (coverUrls.get(project.cover_path) ?? null) : null };

  const free = units.filter((u) => isFree(u.status));
  const sold = units.length - free.length; // reserved + contracted + transferred
  const freeValue = free.reduce((sum, u) => sum + Number(u.price ?? 0), 0);
  // plots per house model, from the same unit_board() rows
  const modelCounts: ModelCounts = {};
  for (const u of units) {
    if (!u.house_model_id) continue;
    const c = (modelCounts[u.house_model_id] ??= { free: 0, total: 0 });
    c.total += 1;
    if (isFree(u.status)) c.free += 1;
  }

  return (
    <>
      {/* Hero: cover picture, name, location, status */}
      <Card padding="none" className="overflow-hidden">
        <div className="aspect-video w-full bg-bg md:aspect-[3/1]">
          <ZoomableCover url={p.cover_url ?? null} name={p.name} />
        </div>
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-3 p-4 sm:p-5">
          <div className="flex min-w-0 flex-[1_1_14rem] flex-col gap-2">
            <h1 className="text-page font-bold break-words text-ink sm:text-page-lg">{p.name}</h1>
            <p className="flex min-w-0 items-center gap-1 text-ink-soft">
              <LocationIcon aria-hidden className="h-4 w-4 shrink-0" />
              <span className="break-words">{p.location || "ยังไม่ระบุที่ตั้ง"}</span>
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Badge tone={p.is_open ? "ok" : "neutral"}>{p.is_open ? "เปิดขาย" : "ปิดการขาย"}</Badge>
              {p.fb_page && (
                <a href={p.fb_page} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center link">
                  เพจ Facebook
                </a>
              )}
            </div>
          </div>
          {isAdmin && (
            <div className="flex shrink-0 flex-wrap gap-2">
              <ProjectFormButton project={p} label="แก้ไขโครงการ" />
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={PlotsIcon} tone="info" label="แปลงทั้งหมด" value={`${num(units.length)} แปลง`} />
        <StatTile icon={FreePlotIcon} tone="brand" label="ว่าง" value={`${num(free.length)} แปลง`} note="รวมแปลงที่มีคนสนใจ" />
        <StatTile icon={SoldIcon} tone="ok" label="ขายแล้ว" value={`${num(sold)} แปลง`} note="จอง ทำสัญญา และโอน" />
        <StatTile icon={ValueIcon} tone="purple" label="มูลค่าคงเหลือ" value={baht(freeValue)} note="ราคารวมแปลงที่ยังว่าง" />
      </div>

      <Card className="flex flex-col gap-3">
        <SectionTitle icon={PlotsIcon} tone="info" title="แปลงในโครงการ" sub="จำนวนแปลงแยกตามสถานะ แตะเพื่อเปิดผังเฉพาะสถานะนั้น" />
        {units.length > 0 ? (
          <StatusSummary units={units} projectId={id} />
        ) : (
          <p className="text-sm text-ink-soft">ยังไม่มีรายการแปลง</p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href={`/plots?project=${id}`} className={buttonClass("primary")}>
            ดูผังและสถานะแปลง
          </Link>
          {me.role !== "sales" && (
            <Link href={`/overview?project=${id}`} className={buttonClass("secondary")}>
              ดูตัวเลขของโครงการนี้
            </Link>
          )}
          {isAdmin && (
            <Link href={`/plots/import?project=${id}`} className={buttonClass("secondary")}>
              นำเข้ารายการแปลง
            </Link>
          )}
        </div>
      </Card>

      <HouseModels projectId={id} models={models} counts={modelCounts} isAdmin={isAdmin} />

      {isAdmin && (
        <>
          <StageSettingsForm projectId={id} initial={(settings.data ?? []) as Parameters<typeof StageSettingsForm>[0]["initial"]} />
          <PlansManager projectId={id} plans={plans} />
          <PinImport key={plans.map((p) => `${p.id}:${p.image_path}`).join("|")} plans={plans} />
          {/* remount after an import or a new picture so the editor starts from the fresh data */}
          <PinEditor key={editorKey(plans, units)} plans={plans} initialUnits={units} />
        </>
      )}
    </>
  );
}
