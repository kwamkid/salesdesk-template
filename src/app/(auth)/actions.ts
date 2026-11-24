"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { originFrom } from "@/lib/origin";
import { createClient } from "@/lib/supabase/server";

// Only allow redirects to pages inside this app.
const safeNext = (next: string) => (next.startsWith("/") && !next.startsWith("//") ? next : "/");

/** The address this app is opened at (localhost while developing, the Vercel address online). */
async function origin() {
  return originFrom(await headers());
}

/** Sign in with Google. An invite token (from an invite link) rides along to /auth/callback. */
export async function signInWithGoogle(form: FormData) {
  const next = safeNext(String(form.get("next") ?? "/"));
  const invite = String(form.get("invite") ?? "").trim();

  const callback = new URL("/auth/callback", await origin());
  callback.searchParams.set("next", next);
  if (invite) callback.searchParams.set("invite", invite);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString(), queryParams: { prompt: "select_account" } },
  });
  if (error || !data.url) redirect("/login?error=google");
  redirect(data.url);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
