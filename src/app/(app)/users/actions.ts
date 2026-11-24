"use server";

import { revalidatePath } from "next/cache";
import type { Role } from "@/config/roles";
import { requireMe } from "@/lib/auth";
import { afterLeadChange } from "@/lib/background";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

/** Approve, change role, disable or re-enable a user, and set their projects.
 *  The database function checks again that the caller is an admin. */
export async function updateUser(input: {
  userId: string;
  role: Role;
  status: "active" | "disabled";
  projectIds: string[] | null;
}): Promise<Result> {
  await requireMe(["admin"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_user", {
    p_user: input.userId,
    p_role: input.role,
    p_status: input.status,
    p_project_ids: input.projectIds,
  });
  if (error) return { ok: false, error: error.message.includes("last admin") ? "last_admin" : "failed" };
  revalidatePath("/users");
  revalidatePath("/queue");
  return { ok: true };
}

/** Create a single-use invite link. Returns the token to put in the link. */
export async function createInvite(input: { role: Role; projectIds: string[]; days: number }) {
  await requireMe(["admin"]);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_invite", {
    p_role: input.role,
    p_project_ids: input.projectIds,
    p_days: input.days,
  });
  if (error || !data) return { ok: false as const };
  revalidatePath("/users");
  return { ok: true as const, token: data as string };
}

/** How many leads a user owns right now (shown on the "move all leads" confirm card). */
export async function countOwnedLeads(userId: string): Promise<{ ok: true; count: number } | { ok: false }> {
  await requireMe(["admin"]);
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId);
  if (error) return { ok: false };
  return { ok: true, count: count ?? 0 };
}

/** Move every lead of one user to another active user. Returns how many moved. */
export async function transferAllLeads(input: { fromId: string; toId: string }): Promise<{ ok: true; moved: number } | { ok: false }> {
  await requireMe(["admin"]);
  if (!input.fromId || !input.toId || input.fromId === input.toId) return { ok: false };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("transfer_leads", { p_from: input.fromId, p_to: input.toId });
  if (error) return { ok: false };
  afterLeadChange(); // sends the "new lead" push to the new owner
  revalidatePath("/users");
  revalidatePath("/queue");
  return { ok: true, moved: Number(data ?? 0) };
}

export async function updateMyName(form: FormData) {
  await requireMe();
  const supabase = await createClient();
  await supabase.rpc("update_my_name", { p_name: String(form.get("full_name") ?? "") });
  revalidatePath("/", "layout");
}
