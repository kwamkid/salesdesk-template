"use server";

import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { BoardUnit } from "@/components/plots/types";

export type NewPlotInput = {
  planId: string;
  code: string;
  zone: string;
  house_type: string;
  price: number | null;
  x: number;
  y: number;
};

const clamp = (n: number) => Math.min(1, Math.max(0, n));

/** Add a plot that is printed on the site plan but missing from the plot list, with its pin
 *  at (x, y) as fractions of the picture (admin). The project comes from the plan.
 *  No revalidatePath: like moveUnitPin, a refresh would remount the pin editor mid-edit. */
export async function createUnitAtPin(
  input: NewPlotInput,
): Promise<{ ok: true; unit: BoardUnit } | { ok: false; error: string }> {
  await requireMe(["admin"]);
  const code = input.code.trim().toUpperCase();
  if (!code) return { ok: false, error: "ใส่เลขแปลง" };
  const price = input.price === null || Number.isNaN(input.price) ? null : input.price;
  if (price !== null && price < 0) return { ok: false, error: "ราคาต้องไม่ติดลบ" };

  const supabase = await createClient();
  const { data: plan } = await supabase.from("site_plans").select("project_id").eq("id", input.planId).single();
  if (!plan) return { ok: false, error: "ไม่พบผังนี้" };

  const { data, error } = await supabase
    .from("units")
    .insert({
      project_id: plan.project_id,
      code,
      zone: input.zone.trim(),
      house_type: input.house_type.trim(),
      price,
      status: "available",
      plan_id: input.planId,
      pos_x: clamp(input.x),
      pos_y: clamp(input.y),
    })
    .select("id, code, zone, house_type, land_sqw, usable_sqm, price, status, note, plan_id, pos_x, pos_y, updated_at")
    .single();
  if (error || !data) {
    if (error?.code === "23505") return { ok: false, error: `มีแปลง ${code} ในโครงการนี้แล้ว` };
    return { ok: false, error: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }
  return {
    ok: true,
    unit: {
      ...(data as Omit<BoardUnit, "interest_count" | "lead_id" | "lead_name" | "holder_name" | "mine">),
      interest_count: 0,
      lead_id: null,
      lead_name: null,
      holder_name: null,
      mine: false,
    },
  };
}
