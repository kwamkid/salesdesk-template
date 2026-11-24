"use server";

import { revalidatePath } from "next/cache";
import { getDocument } from "@/documents";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true; docNo: string } | { ok: false; error: string };

/** Save the printed values and get the next running number, e.g. RS-2569-0001.
 *  The database checks again that the caller may edit this lead. */
export async function issueDocument(input: {
  leadId: string;
  docKey: string;
  values: Record<string, string>;
}): Promise<Result> {
  await requireMe(["admin", "sales"]);
  const doc = getDocument(input.docKey);
  if (!doc) return { ok: false, error: "ไม่พบเอกสารนี้" };

  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select("stage").eq("id", input.leadId).maybeSingle();
  if (!lead) return { ok: false, error: "ไม่พบลูกค้า หรือคุณไม่มีสิทธิ์ดูลูกค้ารายนี้" };

  const { data: allowed } = await supabase
    .from("stage_documents")
    .select("doc_key")
    .eq("stage", lead.stage)
    .eq("doc_key", doc.key)
    .maybeSingle();
  if (!allowed) return { ok: false, error: "ขั้นปัจจุบันของลูกค้าไม่ได้กำหนดให้ออกเอกสารนี้ แอดมินตั้งได้ที่หน้าตั้งค่า" };

  // Keep only the template's own fields, as they were printed
  const data: Record<string, string> = {};
  for (const f of doc.fields) data[f.key] = String(input.values[f.key] ?? "").trim().slice(0, 1000);

  const { data: rows, error } = await supabase.rpc("issue_document", {
    p_lead: input.leadId,
    p_doc_key: doc.key,
    p_prefix: doc.prefix,
    p_data: data,
  });
  const row = (rows as { id: string; doc_no: string }[] | null)?.[0];
  if (error || !row) {
    return { ok: false, error: error?.message.includes("not allowed") ? "คุณไม่มีสิทธิ์ออกเอกสารให้ลูกค้ารายนี้" : "ออกเลขเอกสารไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }
  revalidatePath(`/documents/${input.leadId}/${doc.key}`);
  return { ok: true, docNo: row.doc_no };
}
