import { cookies } from "next/headers";
import { cache } from "react";
import type { Role } from "@/config/roles";
import { createClient } from "@/lib/supabase/server";

/** The project picked in the left menu ("all" or a project id). Shared with ./project-scope-actions.ts */
export const SCOPE_COOKIE = "sd-project";

export type ScopeProject = { id: string; name: string; is_open: boolean };
export type Scope = {
  /** Projects this user may see (RLS: sales get only the ones they look after). */
  projects: ScopeProject[];
  /** null = every project in `projects`. */
  current: ScopeProject | null;
};

/** The project every page starts on. A `?project=` in the URL still wins on pages that read it
 *  (shared links); the switcher drops that param when the user picks another project. */
export const getScope = cache(async (role: Role): Promise<Scope> => {
  const supabase = await createClient();
  const [{ data }, jar] = await Promise.all([
    supabase.from("projects").select("id, name, is_open").order("name"),
    cookies(),
  ]);
  const projects = (data ?? []) as ScopeProject[];
  const raw = jar.get(SCOPE_COOKIE)?.value;
  const picked = projects.find((p) => p.id === raw) ?? null;
  // One project only: nothing to choose. Sales with no saved pick start on their first open project.
  if (projects.length === 1) return { projects, current: projects[0] };
  if (picked || raw === "all") return { projects, current: picked };
  return { projects, current: role === "sales" ? (projects.find((p) => p.is_open) ?? projects[0] ?? null) : null };
});

/** Id of the picked project, or null for all projects. */
export async function scopeProjectId(role: Role): Promise<string | null> {
  return (await getScope(role)).current?.id ?? null;
}
