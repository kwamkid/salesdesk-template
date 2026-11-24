import { createClient } from "@/lib/supabase/server";

/** Profile pictures for a list of user ids (for <Avatar url=…>), as { id: avatar_url }.
 *  For report tables whose RPC returns owner_id + owner_name but no picture. Missing ids are left out. */
export async function loadAvatars(ids: (string | null | undefined)[]): Promise<Record<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  if (unique.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, avatar_url").in("id", unique).order("id");
  return Object.fromEntries((data ?? []).map((p) => [p.id as string, (p.avatar_url as string) ?? ""]));
}
