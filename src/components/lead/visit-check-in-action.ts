"use server";

import { revalidatePath } from "next/cache";
import { afterLeadChange } from "@/lib/background";
import { createClient } from "@/lib/supabase/server";

export type CheckInResult = { ok: true; activityId: string } | { ok: false; message: string };

/** Saves the visit (activity + stage "มาชมแล้ว" + next follow-up) through check_in_visit().
 *  The photo is uploaded afterwards by the browser, so this answers at once. */
export async function checkInVisit(input: { leadId: string; note: string; nextFollowUp: string }): Promise<CheckInResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.nextFollowUp)) return { ok: false, message: "กรุณาเลือกวันที่ต้องตามครั้งถัดไป" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_in_visit", {
    p_lead: input.leadId,
    p_note: input.note.slice(0, 2000),
    p_next_follow_up: input.nextFollowUp,
  });
  if (error || !data) {
    const message = /not allowed/.test(error?.message ?? "")
      ? "คุณไม่มีสิทธิ์บันทึกลูกค้ารายนี้"
      : /follow-up/.test(error?.message ?? "")
        ? "กรุณาเลือกวันที่ต้องตามครั้งถัดไป"
        : "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง";
    return { ok: false, message };
  }

  afterLeadChange(); // Meta event of the visited stage and pushes, after the answer is sent
  revalidatePath(`/leads/${input.leadId}`);
  return { ok: true, activityId: data as string };
}
