"use server";

import { revalidatePath } from "next/cache";
import { STAGES } from "@/config/stages";
import { getDocument } from "@/documents";
import { requireMe } from "@/lib/auth";
import { sendTestEvent } from "@/lib/meta";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: boolean; message?: string };

const FAILED: ActionResult = { ok: false, message: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง" };
const clip = (s: string, n: number) => String(s ?? "").trim().slice(0, n);

/** Every action here is admin only; Row Level Security checks again in the database. */
async function admin() {
  await requireMe(["admin"]);
  return createClient();
}

function done(error: unknown, message = "บันทึกแล้ว"): ActionResult {
  if (error) return FAILED;
  revalidatePath("/settings");
  return { ok: true, message };
}

export async function saveCompany(input: { name: string; address: string; phone: string; tax_id: string }) {
  const supabase = await admin();
  const { error } = await supabase
    .from("company_settings")
    .update({
      company_name: clip(input.name, 200),
      company_address: clip(input.address, 500),
      company_phone: clip(input.phone, 50),
      company_tax_id: clip(input.tax_id, 20),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  return done(error);
}

export async function saveMetaIds(input: { pixel_id: string; test_event_code: string }) {
  const supabase = await admin();
  const pixel = clip(input.pixel_id, 30).replace(/\s/g, "");
  if (pixel && !/^[0-9]+$/.test(pixel)) return { ok: false, message: "Pixel ID เป็นตัวเลขเท่านั้น" };
  const { error } = await supabase
    .from("company_settings")
    .update({ pixel_id: pixel, test_event_code: clip(input.test_event_code, 50), updated_at: new Date().toISOString() })
    .eq("id", 1);
  return done(error);
}

/** The token goes straight into the database function; it is never read back or logged. */
export async function saveMetaToken(token: string) {
  const supabase = await admin();
  const t = String(token ?? "").trim();
  if (t.length < 20) return { ok: false, message: "token สั้นเกินไป คัดลอกมาให้ครบทั้งชุด" };
  const { error } = await supabase.rpc("set_meta_token", { p_token: t });
  return done(error, "บันทึก token แล้ว");
}

export async function testMeta(): Promise<ActionResult> {
  await requireMe(["admin"]);
  const res = await sendTestEvent();
  return { ok: res.ok, message: res.message };
}

export async function addCampaign(input: { name: string; projectId: string | null }) {
  const supabase = await admin();
  const name = clip(input.name, 100);
  if (!name) return { ok: false, message: "ใส่ชื่อแคมเปญ" };
  const { error } = await supabase.from("campaigns").insert({ name, project_id: input.projectId || null });
  return done(error, "เพิ่มแคมเปญแล้ว");
}

export async function updateCampaign(input: { id: string; name: string; projectId: string | null; isActive: boolean }) {
  const supabase = await admin();
  const name = clip(input.name, 100);
  if (!name) return { ok: false, message: "ใส่ชื่อแคมเปญ" };
  const { error } = await supabase
    .from("campaigns")
    .update({ name, project_id: input.projectId || null, is_active: input.isActive })
    .eq("id", input.id);
  return done(error);
}

export async function addLostReason(input: { label: string; sort: number }) {
  const supabase = await admin();
  const label = clip(input.label, 100);
  if (!label) return { ok: false, message: "ใส่เหตุผล" };
  const { error } = await supabase.from("lost_reasons").insert({ label, sort: Math.trunc(Number(input.sort) || 0) });
  return done(error, "เพิ่มเหตุผลแล้ว");
}

export async function updateLostReason(input: { id: string; label: string; sort: number; isActive: boolean }) {
  const supabase = await admin();
  const label = clip(input.label, 100);
  if (!label) return { ok: false, message: "ใส่เหตุผล" };
  const { error } = await supabase
    .from("lost_reasons")
    .update({ label, sort: Math.trunc(Number(input.sort) || 0), is_active: input.isActive })
    .eq("id", input.id);
  return done(error);
}

export async function setStageDocument(input: { stage: string; docKey: string; on: boolean }) {
  const supabase = await admin();
  if (!STAGES.some((s) => s.key === input.stage) || !getDocument(input.docKey)) return FAILED;
  const { error } = input.on
    ? await supabase.from("stage_documents").upsert({ stage: input.stage, doc_key: input.docKey }, { ignoreDuplicates: true })
    : await supabase.from("stage_documents").delete().eq("stage", input.stage).eq("doc_key", input.docKey);
  return done(error);
}
