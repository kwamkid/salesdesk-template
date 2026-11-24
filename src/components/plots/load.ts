// Server-side loaders for plot data. Call only from Server Components or Server Actions.
import { fetchAllRpc } from "@/lib/fetch-all";
import type { createClient } from "@/lib/supabase/server";
import type { BoardUnit, PlanView, ProjectOption } from "./types";

type Db = Awaited<ReturnType<typeof createClient>>;

const SIGNED_URL_SECONDS = 60 * 60;

/** Projects the signed-in user can see (Row Level Security decides). */
export async function loadProjects(db: Db): Promise<ProjectOption[]> {
  const { data } = await db.from("projects").select("id, name, is_open").order("name");
  return (data ?? []) as ProjectOption[];
}

/** Every plot of a project (read 1,000 at a time, so a big project is never cut off).
 *  Returns [] when the user cannot see the project. */
export async function loadBoard(db: Db, projectId: string): Promise<BoardUnit[]> {
  const { rows } = await fetchAllRpc<BoardUnit>(db, "unit_board", { p_project: projectId });
  return rows;
}

/** Site plans of a project with a 1-hour signed URL of each picture (the bucket is private). */
export async function loadPlans(db: Db, projectId: string): Promise<PlanView[]> {
  const { data } = await db
    .from("site_plans")
    .select("id, name, image_path, image_w, image_h, sort")
    .eq("project_id", projectId)
    .order("sort")
    .order("created_at");
  const plans = (data ?? []) as Omit<PlanView, "url">[];
  const paths = plans.map((p) => p.image_path).filter((p): p is string => !!p);
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await db.storage.from("site-plans").createSignedUrls(paths, SIGNED_URL_SECONDS);
    for (const s of signed ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }
  return plans.map((p) => ({ ...p, url: p.image_path ? (urls.get(p.image_path) ?? null) : null }));
}
