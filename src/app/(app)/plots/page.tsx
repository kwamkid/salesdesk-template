import Link from "next/link";
import { PlotBoard } from "@/components/plots/plot-board";
import { loadBoard, loadPlans, loadProjects } from "@/components/plots/load";
import { ProjectSwitcher } from "@/components/plots/project-switcher";
import { isPlotFilter } from "@/components/plots/status-summary";
import { loadHouseModels } from "@/components/projects/load";
import { EmptyState, PageTitle } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { requireMe } from "@/lib/auth";
import { ProjectIcon } from "@/lib/icons";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "แปลง" };

type Search = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Site plan and plot status of one project (sales, executive, admin).
 *  ?project=<id>&unit=<id or code>&status=<plot status tab to start on> */
export default async function PlotsPage({ searchParams }: { searchParams: Search }) {
  const me = await requireMe();
  const sp = await searchParams;
  const supabase = await createClient();
  const projects = await loadProjects(supabase);

  if (projects.length === 0) {
    return (
      <>
        <PageTitle title="แปลง" />
        <EmptyState
          icon={ProjectIcon}
          title="ยังไม่มีโครงการที่คุณดูแล"
          hint={me.role === "admin" ? "เพิ่มโครงการก่อนที่เมนูโครงการ" : "ให้แอดมินมอบหมายโครงการให้คุณ"}
          action={
            me.role === "admin" ? (
              <Link href="/projects" className={buttonClass()}>
                ไปหน้าโครงการ
              </Link>
            ) : undefined
          }
        />
      </>
    );
  }

  const wanted = one(sp.project);
  const project = projects.find((p) => p.id === wanted) ?? projects.find((p) => p.is_open) ?? projects[0];
  const [units, plans, models] = await Promise.all([
    loadBoard(supabase, project.id),
    loadPlans(supabase, project.id),
    loadHouseModels(supabase, project.id),
  ]);

  return (
    <>
      <PageTitle
        title="แปลง"
        sub={project.name}
        action={
          me.role !== "sales" ? (
            <Link href={`/projects/${project.id}`} className={buttonClass("secondary")}>
              โครงการ
            </Link>
          ) : undefined
        }
      />
      <ProjectSwitcher projects={projects} value={project.id} />
      <PlotBoard
        key={project.id}
        projectId={project.id}
        initialUnits={units}
        plans={plans}
        models={models}
        role={me.role}
        meId={me.id}
        initialUnit={one(sp.unit)}
        initialFilter={isPlotFilter(one(sp.status)) ? (one(sp.status) as "all") : "all"}
      />
    </>
  );
}
