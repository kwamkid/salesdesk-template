import Link from "next/link";
import { CampaignsForm, type Campaign } from "@/components/settings/campaigns-form";
import { CompanyForm } from "@/components/settings/company-form";
import { LostReasonsForm, type LostReason } from "@/components/settings/lost-reasons-form";
import { MetaForm } from "@/components/settings/meta-form";
import { StageDocumentsForm } from "@/components/settings/stage-documents-form";
import { Card, PageTitle, SectionTitle } from "@/components/ui/card";
import { DOCUMENTS } from "@/documents";
import { requireMe } from "@/lib/auth";
import { MENU_ICON, ThemeIcon } from "@/lib/icons";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "ตั้งค่า" };

const SettingsIcon = MENU_ICON.gear;

export default async function SettingsPage() {
  await requireMe(["admin"]);
  const supabase = await createClient();
  const [company, tokenSet, campaigns, projects, reasons, stageDocs] = await Promise.all([
    supabase
      .from("company_settings")
      .select("company_name, company_address, company_phone, company_tax_id, pixel_id, test_event_code")
      .eq("id", 1)
      .maybeSingle(),
    supabase.rpc("meta_token_set"),
    supabase.from("campaigns").select("id, name, project_id, is_active").order("is_active", { ascending: false }).order("name"),
    supabase.from("projects").select("id, name").order("name"),
    supabase.from("lost_reasons").select("id, label, sort, is_active").order("sort").order("label"),
    supabase.from("stage_documents").select("stage, doc_key"),
  ]);
  const c = company.data;

  return (
    <>
      <PageTitle title="ตั้งค่า" sub="ข้อมูลบริษัท Meta แคมเปญ เหตุผลที่ไม่ซื้อ และเอกสาร" icon={<SettingsIcon aria-hidden />} />
      <CompanyForm
        initial={{
          name: c?.company_name ?? "",
          address: c?.company_address ?? "",
          phone: c?.company_phone ?? "",
          tax_id: c?.company_tax_id ?? "",
        }}
      />
      <MetaForm
        initial={{ pixel_id: c?.pixel_id ?? "", test_event_code: c?.test_event_code ?? "" }}
        tokenSaved={tokenSet.data === true}
      />
      <CampaignsForm campaigns={(campaigns.data ?? []) as Campaign[]} projects={projects.data ?? []} />
      <LostReasonsForm reasons={(reasons.data ?? []) as LostReason[]} />
      <StageDocumentsForm docs={DOCUMENTS.map((d) => ({ key: d.key, title: d.title }))} initial={stageDocs.data ?? []} />
      <Card className="flex flex-col gap-1">
        <SectionTitle
          icon={ThemeIcon}
          tone="purple"
          title="ธีมและโลโก้"
          sub={
            <>
              สี ฟอนต์ โลโก้ แก้ที่ src/app/globals.css และ src/config/app.ts ดูผลที่{" "}
              <Link href="/theme" className="text-brand underline">
                /theme
              </Link>
            </>
          }
        />
      </Card>
    </>
  );
}
