// Server-side loaders for project cards. Call only from Server Components or Server Actions.
import { HOUSE_CATEGORIES, type HouseCategory } from "@/config/houses";
import type { createClient } from "@/lib/supabase/server";

type Db = Awaited<ReturnType<typeof createClient>>;

export const COVER_BUCKET = "project-images";
const SIGNED_URL_SECONDS = 60 * 60;

export type UnitCounts = {
  project_id: string;
  total: number;
  available: number;
  interested: number;
  reserved: number;
  contracted: number;
  transferred: number;
  free_value: number;
};

/** 1-hour signed URLs of project cover pictures (the bucket is private), keyed by path. */
export async function loadCoverUrls(db: Db, paths: (string | null | undefined)[]): Promise<Map<string, string>> {
  const wanted = paths.filter((p): p is string => !!p);
  const urls = new Map<string, string>();
  if (!wanted.length) return urls;
  const { data } = await db.storage.from(COVER_BUCKET).createSignedUrls(wanted, SIGNED_URL_SECONDS);
  for (const s of data ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  return urls;
}

/** Plot counts of every project the user can see, in one RPC call (0007_project_images.sql). */
export async function loadUnitCounts(db: Db): Promise<Map<string, UnitCounts>> {
  const { data } = await db.rpc("project_unit_counts");
  return new Map(((data ?? []) as UnitCounts[]).map((r) => [r.project_id, { ...r, free_value: Number(r.free_value) }]));
}

/** Reserved + contracted + transferred. */
export const soldCount = (c: Pick<UnitCounts, "reserved" | "contracted" | "transferred">) =>
  c.reserved + c.contracted + c.transferred;

/** One house_models row (0010_house_models.sql) plus a 1-hour signed URL of its picture. */
export type HouseModel = {
  id: string;
  project_id: string;
  name: string;
  category: HouseCategory;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  usable_sqm: number | null;
  land_from_sqw: number | null;
  price_from: number | null;
  description: string;
  image_path: string | null;
  sort: number;
  image_url: string | null;
};

const MODEL_COLUMNS =
  "id, project_id, name, category, bedrooms, bathrooms, parking, usable_sqm, land_from_sqw, price_from, description, image_path, sort";

/** House models of one project, in display order, with picture URLs. Row Level Security decides who sees them. */
export async function loadHouseModels(db: Db, projectId: string): Promise<HouseModel[]> {
  const { data } = await db
    .from("house_models")
    .select(MODEL_COLUMNS)
    .eq("project_id", projectId)
    .order("sort")
    .order("name");
  const rows = (data ?? []) as Omit<HouseModel, "image_url">[];
  const urls = await loadCoverUrls(db, rows.map((m) => m.image_path));
  return rows.map((m) => ({
    ...m,
    usable_sqm: m.usable_sqm === null ? null : Number(m.usable_sqm),
    land_from_sqw: m.land_from_sqw === null ? null : Number(m.land_from_sqw),
    price_from: m.price_from === null ? null : Number(m.price_from),
    image_url: m.image_path ? (urls.get(m.image_path) ?? null) : null,
  }));
}

/** Number of house models per category of every project the user can see (the /projects cards). */
export async function loadModelCategories(db: Db): Promise<Map<string, { category: HouseCategory; count: number }[]>> {
  const { data } = await db.from("house_models").select("project_id, category").order("project_id").order("id");
  const byProject = new Map<string, Map<HouseCategory, number>>();
  for (const r of (data ?? []) as { project_id: string; category: HouseCategory }[]) {
    const m = byProject.get(r.project_id) ?? new Map<HouseCategory, number>();
    m.set(r.category, (m.get(r.category) ?? 0) + 1);
    byProject.set(r.project_id, m);
  }
  const out = new Map<string, { category: HouseCategory; count: number }[]>();
  for (const [pid, m] of byProject) {
    out.set(
      pid,
      HOUSE_CATEGORIES.filter((c) => m.has(c.key)).map((c) => ({ category: c.key, count: m.get(c.key)! })),
    );
  }
  return out;
}
