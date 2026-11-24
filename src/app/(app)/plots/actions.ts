"use server";

import { revalidatePath } from "next/cache";
import type { UnitStatus } from "@/config/units";
import { requireMe } from "@/lib/auth";
import { afterLeadChange } from "@/lib/background";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Database error text (raise exception in 0004_units.sql) -> Thai message. */
function thaiError(message: string | undefined): string {
  const m = message ?? "";
  if (m.includes("already reserved")) return "แปลงนี้มีลูกค้าจองไว้แล้ว เลือกแปลงอื่น หรือให้แอดมินยกเลิกจองก่อน";
  if (m.includes("admin only")) return "เฉพาะแอดมินเท่านั้นที่ยกเลิกจองหรือย้อนสถานะแปลงได้";
  if (m.includes("customer required")) return "ต้องเลือกลูกค้าก่อน";
  if (m.includes("wrong project")) return "ลูกค้ารายนี้อยู่คนละโครงการกับแปลงนี้";
  if (m.includes("not allowed")) return "คุณไม่มีสิทธิ์เปลี่ยนแปลงนี้ (เปลี่ยนได้เฉพาะลูกค้าของคุณเอง)";
  return "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง";
}

/** Reserve, contract or transfer a plot for a customer, or (admin) put it back to free.
 *  The database locks the plot so it cannot be reserved twice, and moves the customer's stage
 *  forward. Then Meta events and push messages go out after the response. */
export async function setUnitStatus(input: {
  unitId: string;
  status: UnitStatus;
  leadId?: string | null;
}): Promise<ActionResult> {
  await requireMe(["sales", "admin"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_unit_status", {
    p_unit: input.unitId,
    p_status: input.status,
    p_lead: input.leadId ?? null,
  });
  if (error) return { ok: false, error: thaiError(error.message) };
  afterLeadChange();
  if (input.leadId) revalidatePath(`/leads/${input.leadId}`);
  return { ok: true };
}

/** Mark or unmark a plot a customer is interested in. */
export async function toggleInterest(input: { unitId: string; leadId: string; on: boolean }): Promise<ActionResult> {
  await requireMe(["sales", "admin"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("toggle_interest", {
    p_unit: input.unitId,
    p_lead: input.leadId,
    p_on: input.on,
  });
  if (error) return { ok: false, error: thaiError(error.message) };
  // No revalidatePath: the picker updates itself at once (optimistic); re-rendering the whole
  // customer page here made every tap wait for it.
  return { ok: true };
}
