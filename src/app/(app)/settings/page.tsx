import { redirect } from "next/navigation";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import {
  CampaignsForm,
  type Campaign,
} from "@/components/settings/campaigns-form";
import { CompanyForm } from "@/components/settings/company-form";
import {
  LostReasonsForm,
  type LostReason,
} from "@/components/settings/lost-reasons-form";
import { MetaForm } from "@/components/settings/meta-form";
import { StageDocumentsForm } from "@/components/settings/stage-documents-form";
import { PageTitle } from "@/components/ui/card";
import { DOCUMENTS } from "@/documents";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "ตั้งค่า" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const raw = (await searchParams).tab;
  // ตั้งค่า opens on its first tab (โครงการ = its own page).
  if (raw !== "meta" && raw !== "company") redirect("/projects");
  const tab: "meta" | "company" = raw;
  await requireMe(["admin"]);
  const supabase = await createClient();
  const [company, tokenSet, campaigns, projects, reasons, stageDocs] =
    await Promise.all([
      supabase
        .from("company_settings")
        .select(
          "company_name, company_address, company_phone, company_tax_id, pixel_id, test_event_code",
        )
        .eq("id", 1)
        .maybeSingle(),
      supabase.rpc("meta_token_set"),
      supabase
        .from("campaigns")
        .select("id, name, project_id, is_active")
        .order("is_active", { ascending: false })
        .order("name"),
      supabase.from("projects").select("id, name").order("name"),
      supabase
        .from("lost_reasons")
        .select("id, label, sort, is_active")
        .order("sort")
        .order("label"),
      supabase.from("stage_documents").select("stage, doc_key"),
    ]);
  const c = company.data;

  return (
    <>
      <SettingsTabs active={tab} />
      {tab === "meta" ? (
        <>
          <PageTitle
            title="Meta"
            sub="ใส่ Pixel ID และ token ครั้งเดียว ระบบส่งผลการขายให้ Meta เอง"
          />
          <MetaForm
            initial={{
              pixel_id: c?.pixel_id ?? "",
              test_event_code: c?.test_event_code ?? "",
            }}
            tokenSaved={tokenSet.data === true}
          />
          <CampaignsForm
            campaigns={(campaigns.data ?? []) as Campaign[]}
            projects={projects.data ?? []}
          />
        </>
      ) : (
        <>
          <PageTitle
            title="บริษัท"
            sub="หัวกระดาษเอกสาร · เอกสารที่ออกในแต่ละขั้น · เหตุผลที่ลูกค้าไม่ซื้อ"
          />
          <CompanyForm
            initial={{
              name: c?.company_name ?? "",
              address: c?.company_address ?? "",
              phone: c?.company_phone ?? "",
              tax_id: c?.company_tax_id ?? "",
            }}
          />
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <StageDocumentsForm
              docs={DOCUMENTS.map((d) => ({ key: d.key, title: d.title }))}
              initial={stageDocs.data ?? []}
            />
            <LostReasonsForm reasons={(reasons.data ?? []) as LostReason[]} />
          </div>
        </>
      )}
    </>
  );
}
