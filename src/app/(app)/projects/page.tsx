import Link from "next/link";
import type { ReactNode } from "react";
import { loadCoverUrls, loadModelCategories, loadUnitCounts, soldCount, type UnitCounts } from "@/components/projects/load";
import { ProjectCover } from "@/components/projects/project-cover";
import { Badge, EmptyState, PageTitle } from "@/components/ui/card";
import { houseCategoryOf, type HouseCategory } from "@/config/houses";
import { requireMe } from "@/lib/auth";
import { num } from "@/lib/format";
import { FreePlotIcon, LocationIcon, ProjectIcon, ReservedIcon, TransferredIcon } from "@/lib/icons";
import { createClient } from "@/lib/supabase/server";
import { ProjectFormButton, type ProjectRow } from "./project-forms";

export const metadata = { title: "โครงการ" };

const NO_UNITS: Omit<UnitCounts, "project_id"> = {
  total: 0,
  available: 0,
  interested: 0,
  reserved: 0,
  contracted: 0,
  transferred: 0,
  free_value: 0,
};

/** Admin: list, add and edit projects. Executive (and sales): the projects they can see, as picture cards. */
export default async function ProjectsPage() {
  const me = await requireMe();
  const isAdmin = me.role === "admin";
  const supabase = await createClient();
  const [{ data }, counts, categories] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, location, fb_page, is_open, cover_path")
      .order("is_open", { ascending: false })
      .order("name"),
    loadUnitCounts(supabase),
    loadModelCategories(supabase),
  ]);
  const rows = (data ?? []) as ProjectRow[];
  const urls = await loadCoverUrls(supabase, rows.map((p) => p.cover_path));
  const projects = rows.map((p) => ({ ...p, cover_url: p.cover_path ? (urls.get(p.cover_path) ?? null) : null }));

  return (
    <>
      <PageTitle
        title="โครงการ"
        sub={`${projects.length} โครงการ`}
        icon={<ProjectIcon aria-hidden />}
        action={isAdmin ? <ProjectFormButton label="เพิ่มโครงการ" /> : undefined}
      />
      {projects.length === 0 ? (
        <EmptyState
          icon={ProjectIcon}
          title="ยังไม่มีโครงการ"
          hint={isAdmin ? "เพิ่มโครงการแรก ใส่ชื่อ ที่ตั้ง และรูปปก แล้วนำเข้ารายการแปลงต่อได้เลย" : "ให้แอดมินมอบหมายโครงการให้คุณ"}
          action={isAdmin ? <ProjectFormButton label="เพิ่มโครงการ" /> : undefined}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              counts={counts.get(p.id) ?? { project_id: p.id, ...NO_UNITS }}
              categories={categories.get(p.id) ?? []}
              isAdmin={isAdmin}
            />
          ))}
        </ul>
      )}
    </>
  );
}

function ProjectCard({
  project: p,
  counts: c,
  categories,
  isAdmin,
}: {
  project: ProjectRow;
  counts: UnitCounts;
  categories: { category: HouseCategory; count: number }[];
  isAdmin: boolean;
}) {
  const sold = soldCount(c);
  const soldPct = c.total > 0 ? Math.round((sold / c.total) * 100) : 0;

  return (
    <li className="relative flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card transition-colors hover:border-line-strong">
      <div className="relative aspect-video w-full overflow-hidden bg-bg">
        <ProjectCover url={p.cover_url ?? null} name={p.name} />
        <span className="absolute top-2 left-2">
          <Badge tone={p.is_open ? "ok" : "neutral"}>{p.is_open ? "เปิดขาย" : "ปิดการขาย"}</Badge>
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          {/* the whole card is the link (stretched ::after); the edit button sits above it */}
          <Link
            href={`/projects/${p.id}`}
            className="block truncate text-lg font-semibold underline-offset-4 after:absolute after:inset-0 hover:underline"
          >
            {p.name}
          </Link>
          <p className="flex min-w-0 items-center gap-1 text-sm text-ink-soft">
            <LocationIcon aria-hidden className="h-4 w-4 shrink-0" />
            <span className="truncate">{p.location || "ยังไม่ระบุที่ตั้ง"}</span>
          </p>
          {categories.length > 0 && (
            <ul aria-label="แบบบ้านในโครงการ" className="mt-2 flex flex-wrap gap-1">
              {categories.map((k) => {
                const cat = houseCategoryOf(k.category);
                return (
                  <li key={k.category}>
                    <Badge tone={cat.tone}>
                      {cat.label} · {num(k.count)} แบบ
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {c.total === 0 ? (
          <p className="text-sm text-ink-soft">ยังไม่มีรายการแปลง</p>
        ) : (
          <>
            {/* ว่าง = available + interested (still free to reserve) · จอง = reserved + contracted */}
            <ul className="grid grid-cols-3 gap-2 text-sm">
              <MiniStat icon={<FreePlotIcon aria-hidden className="h-4 w-4" />} label="แปลงว่าง" value={`${num(c.available + c.interested)}/${num(c.total)}`} tone="text-brand" />
              <MiniStat icon={<ReservedIcon aria-hidden className="h-4 w-4" />} label="จอง" value={num(c.reserved + c.contracted)} tone="text-info" />
              <MiniStat icon={<TransferredIcon aria-hidden className="h-4 w-4" />} label="โอน" value={num(c.transferred)} tone="text-ok" />
            </ul>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-ink-soft">
                <span>ขายแล้ว {num(sold)} แปลง</span>
                <span>{soldPct}%</span>
              </div>
              <div
                role="progressbar"
                aria-label={`ขายแล้ว ${soldPct}% ของแปลงทั้งหมด`}
                aria-valuenow={soldPct}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-2 w-full overflow-hidden rounded-full bg-line"
              >
                <div className="h-full rounded-full bg-ok" style={{ width: `${soldPct}%` }} />
              </div>
            </div>
          </>
        )}

        {isAdmin && (
          <div className="relative z-10 mt-auto flex justify-end">
            <ProjectFormButton project={p} label="แก้ไข" />
          </div>
        )}
      </div>
    </li>
  );
}

function MiniStat({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: string }) {
  return (
    <li className="flex flex-col gap-0.5 rounded-control bg-bg px-2 py-1.5">
      <span className={`flex items-center gap-1 text-xs ${tone}`}>
        {icon}
        <span className="text-ink-soft">{label}</span>
      </span>
      <span className="font-semibold text-ink">{value}</span>
    </li>
  );
}
