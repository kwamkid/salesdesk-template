import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { getDocument } from "@/documents";
import { createClient } from "@/lib/supabase/server";

/** Drop-in for the customer page: one button per document this stage may issue
 *  (Settings > documents per stage). Usage: <DocumentsButton leadId={lead.id} stage={lead.stage} /> */
export async function DocumentsButton({ leadId, stage }: { leadId: string; stage: string }) {
  const supabase = await createClient();
  const { data } = await supabase.from("stage_documents").select("doc_key").eq("stage", stage);
  const docs = (data ?? []).map((r) => getDocument(r.doc_key)).filter((d) => d !== null);

  if (docs.length === 0) return <p className="text-sm text-ink-soft">ขั้นนี้ยังไม่มีเอกสารให้ออก</p>;

  return (
    <div className="flex flex-wrap gap-2">
      {docs.map((d) => (
        <Link key={d.key} href={`/documents/${leadId}/${d.key}`} className={buttonClass("secondary")}>
          ออก{d.title}
        </Link>
      ))}
    </div>
  );
}
