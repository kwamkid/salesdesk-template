import { notFound } from "next/navigation";
import { Card, EmptyState } from "@/components/ui/card";
import { docNumber, fillValues, getDocument, thLongDate } from "@/documents";
import type { DocBag } from "@/documents/types";
import { requireMe } from "@/lib/auth";
import { thDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { DocumentReview } from "./document-review";

export const metadata = { title: "ออกเอกสาร" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A4 print: the app shell (top bar, menu) lives in the (app) layout, so it is hidden here
// with print rules that only exist while this page is open. Sizes in mm/pt are for paper only.
const PRINT_CSS = `
@page { size: A4; margin: 15mm; }
@media print {
  html { font-size: 10.5pt; }
  body { background: white !important; }
  header, nav, .no-print { display: none !important; }
  main { padding: 0 !important; margin: 0 !important; max-width: none !important; }
  .doc-print-root { gap: 0 !important; }
  .doc-paper { border: 0 !important; border-radius: 0 !important; padding: 0 !important; background: white !important; }
  .doc-paper, .doc-paper * { color: black !important; }
  .doc-paper .border-line { border-color: gray !important; }
  .doc-paper .border-ink, .doc-paper .border-ink-soft { border-color: black !important; }
  .doc-paper .doc-empty { background: transparent !important; }
}
`;

type Unit = { code: string; zone: string; house_type: string; land_sqw: number | null; usable_sqm: number | null; price: number | null };
type One<T> = T | T[] | null;
const one = <T,>(x: One<T>): T | null => (Array.isArray(x) ? (x[0] ?? null) : x);

export default async function DocumentPage({ params }: { params: Promise<{ leadId: string; docKey: string }> }) {
  const me = await requireMe();
  const { leadId, docKey } = await params;
  const doc = getDocument(docKey);
  if (!doc || !UUID.test(leadId)) notFound();

  const supabase = await createClient();
  const UNIT_COLS = "code, zone, house_type, land_sqw, usable_sqm, price";
  const [leadRes, companyRes, reservedRes, interestRes, historyRes, editRes] = await Promise.all([
    supabase
      .from("leads")
      .select("id, full_name, phone, email, address, national_id, stage, projects(name, location), owner:profiles!owner_id(full_name)")
      .eq("id", leadId)
      .maybeSingle(),
    supabase.from("company_settings").select("company_name, company_address, company_phone, company_tax_id").eq("id", 1).maybeSingle(),
    supabase.from("units").select(UNIT_COLS).eq("lead_id", leadId).order("updated_at", { ascending: false }).limit(1),
    supabase.from("unit_interests").select(`created_at, units(${UNIT_COLS})`).eq("lead_id", leadId).order("created_at").limit(1),
    supabase
      .from("issued_documents")
      .select("id, doc_key, doc_no, issued_at, issuer:profiles!issued_by(full_name)")
      .eq("lead_id", leadId)
      .order("issued_at", { ascending: false })
      .limit(30),
    supabase.rpc("can_edit_lead", { p_lead: leadId }),
  ]);

  const lead = leadRes.data;
  if (!lead) notFound();

  const { data: allowed } = await supabase
    .from("stage_documents")
    .select("doc_key")
    .eq("stage", lead.stage)
    .eq("doc_key", doc.key)
    .maybeSingle();

  const project = one(lead.projects as One<{ name: string; location: string }>);
  const owner = one(lead.owner as One<{ full_name: string }>);
  const unit =
    (reservedRes.data?.[0] as Unit | undefined) ?? one(interestRes.data?.[0]?.units as One<Unit> | undefined ?? null);
  const c = companyRes.data;

  const bag: DocBag = {
    company: {
      name: c?.company_name ?? "",
      address: c?.company_address ?? "",
      phone: c?.company_phone ?? "",
      tax_id: c?.company_tax_id ?? "",
    },
    lead: {
      full_name: lead.full_name ?? "",
      phone: lead.phone ?? "",
      email: lead.email ?? "",
      address: lead.address ?? "",
      national_id: lead.national_id ?? "",
    },
    project: { name: project?.name ?? "", location: project?.location ?? "" },
    unit: {
      code: unit?.code ?? "",
      zone: unit?.zone ?? "",
      house_type: unit?.house_type ?? "",
      land_sqw: docNumber(unit?.land_sqw),
      usable_sqm: docNumber(unit?.usable_sqm),
      price: docNumber(unit?.price),
    },
    sales: { name: owner?.full_name || me.full_name || "" },
    today: thLongDate(),
  };

  const canIssue = editRes.data === true && !!allowed;
  const blockedReason =
    editRes.data !== true
      ? "ดูได้อย่างเดียว เฉพาะเซลส์เจ้าของลูกค้าและแอดมินที่ออกเอกสารได้"
      : !allowed
        ? "ขั้นปัจจุบันของลูกค้าไม่ได้กำหนดให้ออกเอกสารนี้ แอดมินตั้งได้ที่หน้าตั้งค่า > เอกสารแต่ละขั้น"
        : undefined;

  const history = (historyRes.data ?? []) as {
    id: string;
    doc_key: string;
    doc_no: string;
    issued_at: string;
    issuer: One<{ full_name: string }>;
  }[];

  return (
    <>
      <style>{PRINT_CSS}</style>
      <DocumentReview
        leadId={leadId}
        docKey={doc.key}
        initial={fillValues(doc, bag)}
        canIssue={canIssue}
        blockedReason={blockedReason}
      />

      <section className="no-print flex flex-col gap-2">
        <h2 className="text-lg font-semibold">เอกสารที่ออกให้ลูกค้ารายนี้</h2>
        {history.length === 0 ? (
          <EmptyState title="ยังไม่เคยออกเอกสาร" hint="เมื่อกดพิมพ์ เลขเอกสารจะขึ้นที่นี่" />
        ) : (
          <ul className="flex flex-col gap-2">
            {history.map((h) => (
              <li key={h.id}>
                <Card className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {getDocument(h.doc_key)?.title ?? h.doc_key} · {h.doc_no}
                    </p>
                    <p className="text-sm text-ink-soft">
                      {thDateTime(h.issued_at)} · โดย {one(h.issuer)?.full_name || "-"}
                    </p>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
