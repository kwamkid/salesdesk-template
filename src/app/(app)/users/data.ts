import { createClient } from "@/lib/supabase/server";
import type { ProjectOption, UserRow } from "./user-forms";

/** Everything the admin's user screens need: users with their projects, and the project list. */
export async function loadUsers(): Promise<{ users: UserRow[]; projects: ProjectOption[] }> {
  const supabase = await createClient();
  const [profiles, members, projects] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, role, status, avatar_url").order("created_at"),
    supabase.from("project_members").select("project_id, user_id"),
    supabase.from("projects").select("id, name").order("name"),
  ]);

  const byUser = new Map<string, string[]>();
  for (const m of members.data ?? []) byUser.set(m.user_id, [...(byUser.get(m.user_id) ?? []), m.project_id]);

  return {
    users: (profiles.data ?? []).map((p) => ({ ...p, projectIds: byUser.get(p.id) ?? [] })) as UserRow[],
    projects: (projects.data ?? []) as ProjectOption[],
  };
}
