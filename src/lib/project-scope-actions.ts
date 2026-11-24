"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireMe } from "@/lib/auth";
import { SCOPE_COOKIE } from "@/lib/project-scope";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Remember the project picked in the left menu. It only narrows what pages show:
 *  RLS still decides which projects a user can read. */
export async function setScope(value: string) {
  await requireMe();
  if (value !== "all" && !UUID.test(value)) return;
  (await cookies()).set(SCOPE_COOKIE, value, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true });
  revalidatePath("/", "layout");
}
