import { cache } from "react";
import { redirect } from "next/navigation";
import type { Role } from "@/config/roles";
import { createClient } from "@/lib/supabase/server";

export type Me = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  status: "pending" | "active" | "disabled";
  avatar_url: string;
};

/** The signed-in user's profile, or null. Cached for the length of one request. */
export const getMe = cache(async (): Promise<Me | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, status, avatar_url")
    .eq("id", auth.user.id)
    .maybeSingle();
  return (data as Me | null) ?? null;
});

/** Use at the top of every page behind the login. Optionally limit to some roles. */
export async function requireMe(roles?: Role[]): Promise<Me> {
  const me = await getMe();
  if (!me) redirect("/login");
  if (me.status !== "active") redirect("/pending");
  if (roles && !roles.includes(me.role)) redirect("/");
  return me;
}
