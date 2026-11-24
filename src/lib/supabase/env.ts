export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** False until .env.local is filled in. The app shows /setup instead of crashing. */
export const hasSupabaseEnv =
  SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("xxxxxxxx") && SUPABASE_KEY.length > 20;
