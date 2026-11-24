// Public lead intake for the project website (the lead form built on day 2).
//
// IMPORTANT: the website must call this from its SERVER (an API route, server action or
// form handler), never from the browser. The x-api-key header would be visible to anyone
// who opens the page source, and then anyone could add fake leads.
//
//   POST /api/leads
//   x-api-key: <LEADS_API_KEY>
//   { "project_id": "...", "full_name": "...", "phone": "081...", "email": "", "campaign": "", "note": "" }
//   -> { "ok": true, "id": "<lead id>" }

import { afterLeadChange } from "@/lib/background";
import { phoneLocal } from "@/lib/meta";
import { createAdminClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const reply = (status: number, body: Record<string, unknown>) => Response.json(body, { status });

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function POST(request: Request) {
  const key = process.env.LEADS_API_KEY ?? "";
  if (key.length < 16 || request.headers.get("x-api-key") !== key) {
    return reply(401, { ok: false, error: "unauthorized" });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return reply(400, { ok: false, error: "invalid_json" });
  }
  if (!body || typeof body !== "object") return reply(400, { ok: false, error: "invalid_json" });

  const projectId = text(body.project_id, 36);
  const fullName = text(body.full_name, 200);
  const phone = phoneLocal(text(body.phone, 30));
  const email = text(body.email, 200).toLowerCase();
  const campaign = text(body.campaign, 100);
  const note = text(body.note, 2000);

  const errors: string[] = [];
  if (!UUID.test(projectId)) errors.push("project_id");
  if (!fullName) errors.push("full_name");
  if (!/^0[0-9]{8,9}$/.test(phone)) errors.push("phone");
  if (email && !EMAIL.test(email)) errors.push("email");
  if (errors.length) return reply(400, { ok: false, error: "invalid", fields: errors });

  const db = createAdminClient();

  const { data: project } = await db.from("projects").select("id").eq("id", projectId).maybeSingle();
  if (!project) return reply(400, { ok: false, error: "invalid", fields: ["project_id"] });

  // Sales person of this project with the fewest open leads; null = the admin assigns it in /queue
  const { data: owner } = await db.rpc("pick_owner", { p_project: projectId });

  let campaignId: string | null = null;
  if (campaign) {
    const { data: found } = await db
      .from("campaigns")
      .select("id, project_id")
      .eq("name", campaign)
      .or(`project_id.eq.${projectId},project_id.is.null`)
      .order("project_id", { nullsFirst: false })
      .limit(1);
    campaignId = found?.[0]?.id ?? null;
    if (!campaignId) {
      const { data: created } = await db
        .from("campaigns")
        .insert({ name: campaign, project_id: projectId })
        .select("id")
        .single();
      campaignId = created?.id ?? null;
    }
  }

  // The same person sent the form again: keep one lead, add a note to it, do not hand out a second lead.
  const { data: existing } = await db
    .from("leads")
    .select("id")
    .eq("project_id", projectId)
    .eq("phone", phone)
    .not("stage", "in", "(transferred,lost,unqualified)")
    .limit(1)
    .maybeSingle();
  if (existing) {
    await db.from("activities").insert({
      lead_id: existing.id,
      type: "other",
      note: `ส่งฟอร์มจากเว็บไซต์อีกครั้ง${note ? `: ${note}` : ""}`,
      created_by: null,
    });
    afterLeadChange();
    return reply(200, { ok: true, id: existing.id, duplicate: true });
  }

  const { data: lead, error } = await db
    .from("leads")
    .insert({
      project_id: projectId,
      owner_id: (owner as string | null) ?? null,
      full_name: fullName,
      phone,
      email,
      campaign_id: campaignId,
      source: "web",
      created_by: null,
    })
    .select("id")
    .single();
  if (error || !lead) return reply(500, { ok: false, error: "insert_failed" });

  // created_by null = a system note; the database does not count it as contacting the customer
  if (note) {
    await db.from("activities").insert({ lead_id: lead.id, type: "other", note: `จากเว็บไซต์: ${note}`, created_by: null });
  }

  afterLeadChange();
  return reply(200, { ok: true, id: lead.id });
}
