"use server";

import { revalidatePath } from "next/cache";
import { HOUSE_CATEGORIES, type HouseCategory } from "@/config/houses";
import type { StageKey } from "@/config/stages";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };
const FAILED = "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง";

const refresh = (projectId?: string) => {
  revalidatePath("/projects");
  if (projectId) revalidatePath(`/projects/${projectId}`);
  revalidatePath("/plots");
};

export type ProjectInput = { name: string; location: string; fb_page: string; is_open: boolean };

const clean = (p: ProjectInput) => ({
  name: p.name.trim(),
  location: p.location.trim(),
  fb_page: p.fb_page.trim(),
  is_open: p.is_open,
});

/** Add a project (admin). Returns its id. */
export async function createProject(input: ProjectInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requireMe(["admin"]);
  const row = clean(input);
  if (!row.name) return { ok: false, error: "ใส่ชื่อโครงการ" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").insert(row).select("id").single();
  if (error || !data) return { ok: false, error: FAILED };
  refresh();
  return { ok: true, id: data.id as string };
}

/** Edit name, location, Facebook page and open/closed (admin). */
export async function updateProject(id: string, input: ProjectInput): Promise<Result> {
  await requireMe(["admin"]);
  const row = clean(input);
  if (!row.name) return { ok: false, error: "ใส่ชื่อโครงการ" };
  const supabase = await createClient();
  const { error } = await supabase.from("projects").update(row).eq("id", id);
  if (error) return { ok: false, error: FAILED };
  refresh(id);
  return { ok: true };
}

const COVER_BUCKET = "project-images"; // 0007_project_images.sql

/** Save the cover picture the browser just uploaded to "project-images" and remove the old file (admin).
 *  `path` = null removes the cover. */
export async function setProjectCover(projectId: string, path: string | null): Promise<Result> {
  await requireMe(["admin"]);
  // the file must sit in this project's folder: <project_id>/cover-<timestamp>.jpg
  if (path !== null && !path.startsWith(`${projectId}/cover-`)) return { ok: false, error: FAILED };
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("cover_path").eq("id", projectId).maybeSingle();
  if (!project) return { ok: false, error: "ไม่พบโครงการนี้" };
  const { error } = await supabase.from("projects").update({ cover_path: path }).eq("id", projectId);
  if (error) return { ok: false, error: FAILED };
  if (project.cover_path && project.cover_path !== path) {
    await supabase.storage.from(COVER_BUCKET).remove([project.cover_path]);
  }
  refresh(projectId);
  return { ok: true };
}

export type StageSettingInput = { stage: StageKey; value: number | null; send_event: boolean; event_name: string };

/** Value and Meta event of each stage for one project (admin). One row per stage. */
export async function saveStageSettings(projectId: string, rows: StageSettingInput[]): Promise<Result> {
  await requireMe(["admin"]);
  const supabase = await createClient();
  const { error } = await supabase.from("stage_settings").upsert(
    rows.map((r) => ({
      project_id: projectId,
      stage: r.stage,
      value: r.value === null || Number.isNaN(r.value) ? null : r.value,
      send_event: r.send_event,
      event_name: r.event_name.trim(),
    })),
    { onConflict: "project_id,stage" },
  );
  if (error) return { ok: false, error: FAILED };
  refresh(projectId);
  return { ok: true };
}

/** Add a site plan (zone or phase) to a project (admin). The picture is uploaded after. */
export async function createPlan(projectId: string, name: string): Promise<Result> {
  await requireMe(["admin"]);
  const supabase = await createClient();
  const { count } = await supabase
    .from("site_plans")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  const { error } = await supabase
    .from("site_plans")
    .insert({ project_id: projectId, name: name.trim() || "ผังโครงการ", sort: count ?? 0 });
  if (error) return { ok: false, error: FAILED };
  refresh(projectId);
  return { ok: true };
}

/** Save the picture the browser just uploaded to "site-plans" and remove the old file (admin). */
export async function setPlanImage(input: {
  planId: string;
  path: string;
  width: number;
  height: number;
}): Promise<Result> {
  await requireMe(["admin"]);
  const supabase = await createClient();
  const { data: plan } = await supabase
    .from("site_plans")
    .select("project_id, image_path")
    .eq("id", input.planId)
    .maybeSingle();
  if (!plan) return { ok: false, error: "ไม่พบผังนี้" };
  // the file must sit in this project's folder: <project_id>/<plan_id>-<timestamp>.<ext>
  if (!input.path.startsWith(`${plan.project_id}/${input.planId}-`)) return { ok: false, error: FAILED };

  const { error } = await supabase
    .from("site_plans")
    .update({ image_path: input.path, image_w: Math.round(input.width), image_h: Math.round(input.height) })
    .eq("id", input.planId);
  if (error) return { ok: false, error: FAILED };
  if (plan.image_path && plan.image_path !== input.path) {
    await supabase.storage.from("site-plans").remove([plan.image_path]);
  }
  refresh(plan.project_id as string);
  return { ok: true };
}

/** Delete a plan and its picture (admin). Plots on it lose their pin (plan_id becomes null). */
export async function deletePlan(planId: string): Promise<Result> {
  await requireMe(["admin"]);
  const supabase = await createClient();
  const { data: plan } = await supabase
    .from("site_plans")
    .select("project_id, image_path")
    .eq("id", planId)
    .maybeSingle();
  if (!plan) return { ok: false, error: "ไม่พบผังนี้" };
  const { error } = await supabase.from("site_plans").delete().eq("id", planId);
  if (error) return { ok: false, error: FAILED };
  if (plan.image_path) await supabase.storage.from("site-plans").remove([plan.image_path]);
  refresh(plan.project_id as string);
  return { ok: true };
}

export type PinInput = { plot: string; x: number; y: number };
export type PinImportResult = { placed: number; missing_in_list: string[]; without_pin: string[] };

/** Import pins.json made by Claude Code (admin) through import_unit_positions(). */
export async function importPins(
  planId: string,
  pins: PinInput[],
): Promise<{ ok: true; result: PinImportResult } | { ok: false; error: string }> {
  await requireMe(["admin"]);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("import_unit_positions", { p_plan: planId, p_pins: pins });
  if (error || !data) {
    return { ok: false, error: error?.message.includes("plan not found") ? "ไม่พบผังนี้" : "นำเข้าไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }
  const { data: plan } = await supabase.from("site_plans").select("project_id").eq("id", planId).maybeSingle();
  refresh(plan?.project_id as string | undefined);
  return { ok: true, result: data as PinImportResult };
}

/** Edit mode: move a pin, place a plot that had none, or remove a pin (x = y = null). Admin only. */
export async function moveUnitPin(input: {
  unitId: string;
  planId: string | null;
  x: number | null;
  y: number | null;
}): Promise<Result> {
  await requireMe(["admin"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("move_unit_pin", {
    p_unit: input.unitId,
    p_plan: input.planId,
    p_x: input.x,
    p_y: input.y,
  });
  if (error) return { ok: false, error: FAILED };
  return { ok: true };
}

// ---------------------------------------------------------------
// House models (0010_house_models.sql)
// ---------------------------------------------------------------
export type HouseModelInput = {
  name: string;
  category: HouseCategory;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  usable_sqm: number | null;
  land_from_sqw: number | null;
  price_from: number | null;
  description: string;
};

const count = (n: number | null) => (n === null || !Number.isFinite(n) || n < 0 ? null : Math.round(n));
const amount = (n: number | null) => (n === null || !Number.isFinite(n) || n < 0 ? null : n);

const cleanModel = (m: HouseModelInput) => ({
  name: m.name.trim(),
  category: HOUSE_CATEGORIES.some((c) => c.key === m.category) ? m.category : HOUSE_CATEGORIES[0].key,
  bedrooms: count(m.bedrooms),
  bathrooms: count(m.bathrooms),
  parking: count(m.parking),
  usable_sqm: amount(m.usable_sqm),
  land_from_sqw: amount(m.land_from_sqw),
  price_from: amount(m.price_from),
  description: m.description.trim(),
});

const modelError = (error: { code?: string } | null) =>
  error?.code === "23505" ? "มีแบบบ้านชื่อนี้ในโครงการแล้ว ใช้ชื่ออื่น" : FAILED;

/** Add a house model to a project (admin). Returns its id; the picture is uploaded after. */
export async function createHouseModel(
  projectId: string,
  input: HouseModelInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requireMe(["admin"]);
  const row = cleanModel(input);
  if (!row.name) return { ok: false, error: "ใส่ชื่อแบบบ้าน" };
  const supabase = await createClient();
  const { count: n } = await supabase
    .from("house_models")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  const { data, error } = await supabase
    .from("house_models")
    .insert({ ...row, project_id: projectId, sort: n ?? 0 })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: modelError(error) };
  refresh(projectId);
  return { ok: true, id: data.id as string };
}

/** Edit a house model (admin). */
export async function updateHouseModel(modelId: string, input: HouseModelInput): Promise<Result> {
  await requireMe(["admin"]);
  const row = cleanModel(input);
  if (!row.name) return { ok: false, error: "ใส่ชื่อแบบบ้าน" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("house_models").update(row).eq("id", modelId).select("project_id").maybeSingle();
  if (error) return { ok: false, error: modelError(error) };
  if (!data) return { ok: false, error: "ไม่พบแบบบ้านนี้" };
  refresh(data.project_id as string);
  return { ok: true };
}

/** Save the picture the browser just uploaded to "project-images" and remove the old file (admin).
 *  `path` = null removes the picture. */
export async function setHouseModelImage(modelId: string, path: string | null): Promise<Result> {
  await requireMe(["admin"]);
  const supabase = await createClient();
  const { data: model } = await supabase
    .from("house_models")
    .select("project_id, image_path")
    .eq("id", modelId)
    .maybeSingle();
  if (!model) return { ok: false, error: "ไม่พบแบบบ้านนี้" };
  // the file must sit in this project's models folder: <project_id>/models/<model_id>-<timestamp>.jpg
  if (path !== null && !path.startsWith(`${model.project_id}/models/${modelId}-`)) return { ok: false, error: FAILED };
  const { error } = await supabase.from("house_models").update({ image_path: path }).eq("id", modelId);
  if (error) return { ok: false, error: FAILED };
  if (model.image_path && model.image_path !== path) {
    await supabase.storage.from(COVER_BUCKET).remove([model.image_path]);
  }
  refresh(model.project_id as string);
  return { ok: true };
}

/** Delete a house model and its picture (admin). Its plots stay; they only lose the link to the model. */
export async function deleteHouseModel(modelId: string): Promise<Result> {
  await requireMe(["admin"]);
  const supabase = await createClient();
  const { data: model } = await supabase
    .from("house_models")
    .select("project_id, image_path")
    .eq("id", modelId)
    .maybeSingle();
  if (!model) return { ok: false, error: "ไม่พบแบบบ้านนี้" };
  const { error } = await supabase.from("house_models").delete().eq("id", modelId);
  if (error) return { ok: false, error: FAILED };
  if (model.image_path) await supabase.storage.from(COVER_BUCKET).remove([model.image_path]);
  refresh(model.project_id as string);
  return { ok: true };
}
