import { revalidatePath } from "next/cache";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LoanScreeningForm, type LoanInput, type LoanRow } from "./loan-screening-form";

const STATUSES = ["not_screened", "waiting_docs", "submitted", "approved", "rejected"];

/** Save the loan pre-screening. Row Level Security lets the owner sales person and the admin write. */
async function saveLoanScreening(leadId: string, input: LoanInput): Promise<{ ok: boolean; error?: string }> {
  "use server";
  await requireMe(["admin", "sales"]);
  if (!STATUSES.includes(input.status)) return { ok: false, error: "สถานะไม่ถูกต้อง" };
  const failReason = input.fail_reason.trim();
  if (input.status === "rejected" && !failReason) return { ok: false, error: "ใส่เหตุผลที่กู้ไม่ผ่านก่อนบันทึก" };

  const amount = (s: string) => {
    const n = Number(String(s).replace(/,/g, ""));
    return s.trim() === "" || !Number.isFinite(n) || n < 0 ? null : n;
  };

  const supabase = await createClient();
  const { error } = await supabase.from("loan_screenings").upsert(
    {
      lead_id: leadId,
      status: input.status,
      occupation: input.occupation.trim().slice(0, 200),
      monthly_income: amount(input.monthly_income),
      monthly_debt: amount(input.monthly_debt),
      wanted_amount: amount(input.wanted_amount),
      bank: input.bank.trim().slice(0, 100),
      approved_amount: amount(input.approved_amount),
      fail_reason: input.status === "rejected" ? failReason.slice(0, 500) : "",
    },
    { onConflict: "lead_id" },
  );
  if (error) return { ok: false, error: "บันทึกไม่สำเร็จ คุณอาจไม่มีสิทธิ์แก้ลูกค้ารายนี้" };
  revalidatePath(`/leads/${leadId}`);
  return { ok: true };
}

/** Drop-in for the customer page. Executives see it read-only.
 *  Usage: <LoanScreeningCard leadId={lead.id} editable={me.role !== "executive"} /> */
export async function LoanScreeningCard({ leadId, editable }: { leadId: string; editable: boolean }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("loan_screenings")
    .select(
      "status, occupation, monthly_income, monthly_debt, wanted_amount, bank, approved_amount, fail_reason, updated_at, editor:profiles!updated_by(full_name)",
    )
    .eq("lead_id", leadId)
    .maybeSingle();

  const editor = Array.isArray(data?.editor) ? data.editor[0] : data?.editor;
  const row: LoanRow | null = data
    ? {
        status: data.status,
        occupation: data.occupation,
        monthly_income: data.monthly_income,
        monthly_debt: data.monthly_debt,
        wanted_amount: data.wanted_amount,
        bank: data.bank,
        approved_amount: data.approved_amount,
        fail_reason: data.fail_reason,
        updated_at: data.updated_at,
        updated_by_name: (editor as { full_name?: string } | null | undefined)?.full_name ?? "",
      }
    : null;

  return <LoanScreeningForm row={row} editable={editable} save={saveLoanScreening.bind(null, leadId)} />;
}
