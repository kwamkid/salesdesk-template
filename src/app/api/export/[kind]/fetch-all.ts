import type { SupabaseClient } from "@supabase/supabase-js";

const PAGE = 1000;

/** Every row of a set-returning RPC. PostgREST stops at 1,000 rows per request without
 *  telling you, so this reads page by page. The export functions all end with ORDER BY,
 *  which keeps the pages stable. */
export async function fetchAllRpc<T>(
  supabase: SupabaseClient,
  fn: string,
  args: Record<string, unknown>,
): Promise<{ rows: T[]; error: string | null }> {
  const rows: T[] = [];
  for (let start = 0; ; start += PAGE) {
    const { data, error } = await supabase.rpc(fn, args).range(start, start + PAGE - 1);
    if (error) return { rows, error: error.message };
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE) return { rows, error: null };
  }
}
