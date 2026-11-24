// Meta Conversions API. Server only: it reads the token with the secret key.
// Never import this file from a Client Component, and never log the token.

import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";

// Graph API version. Meta supports each version for about two years; bump it here when
// Events Manager says this one is going away (https://developers.facebook.com/docs/graph-api/changelog).
export const META_GRAPH_VERSION = "v23.0";

const MAX_ATTEMPTS = 5;
const BATCH_LIMIT = 50;

type Admin = ReturnType<typeof createAdminClient>;
type MetaConfig = { pixel: string; token: string; testCode: string };

type EventRow = {
  id: number;
  stage: string;
  event_name: string;
  value: number | string | null;
  event_time: string;
  attempts: number;
  leads: { phone: string; email: string } | { phone: string; email: string }[] | null;
};

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Thai phone in international digits for Meta: "081-234 5678" -> "66812345678". */
export function phoneForMeta(phone: string): string {
  const d = (phone ?? "").replace(/[^0-9]/g, "");
  if (!d) return "";
  if (d.startsWith("66")) return d;
  if (d.startsWith("0")) return `66${d.slice(1)}`;
  return d;
}

/** Thai phone in the local form the database keeps: "+66 81 234 5678" -> "0812345678". */
export function phoneLocal(phone: string): string {
  const d = (phone ?? "").replace(/[^0-9]/g, "");
  return /^66[0-9]{8,9}$/.test(d) ? `0${d.slice(2)}` : d;
}

function userData(phone: string, email: string) {
  const ph = phoneForMeta(phone);
  const em = (email ?? "").trim().toLowerCase();
  const out: { ph?: string[]; em?: string[] } = {};
  if (ph) out.ph = [sha256(ph)];
  if (em) out.em = [sha256(em)];
  return out;
}

async function loadConfig(db: Admin): Promise<MetaConfig | null> {
  const [settings, secret] = await Promise.all([
    db.from("company_settings").select("pixel_id, test_event_code").eq("id", 1).maybeSingle(),
    db.from("meta_secrets").select("capi_token").eq("id", 1).maybeSingle(),
  ]);
  const pixel = String(settings.data?.pixel_id ?? "").trim();
  const token = String(secret.data?.capi_token ?? "").trim();
  if (!pixel || !token) return null;
  return { pixel, token, testCode: String(settings.data?.test_event_code ?? "").trim() };
}

/** POST events to Meta. Returns an error text (without the token) or null when accepted. */
async function postEvents(cfg: MetaConfig, data: unknown[], testCode?: string): Promise<string | null> {
  const body: Record<string, unknown> = { data, access_token: cfg.token };
  if (testCode) body.test_event_code = testCode;
  try {
    const res = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(cfg.pixel)}/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (res.ok) return null;
    const json = (await res.json().catch(() => null)) as { error?: { message?: string; error_user_msg?: string } } | null;
    const msg = json?.error?.error_user_msg || json?.error?.message || `HTTP ${res.status}`;
    return clean(msg, cfg.token);
  } catch (e) {
    return clean(e instanceof Error ? e.message : "network error", cfg.token);
  }
}

/** Error text kept in the database: never contains the token, at most 500 characters. */
const clean = (msg: string, token: string) => (token ? msg.split(token).join("***") : msg).slice(0, 500);

function toEvent(row: EventRow) {
  const lead = Array.isArray(row.leads) ? row.leads[0] : row.leads;
  const custom: Record<string, unknown> = { lead_stage: row.stage };
  if (row.value !== null && row.value !== "") {
    custom.value = Number(row.value);
    custom.currency = "THB";
  }
  return {
    event_name: row.event_name,
    event_time: Math.floor(new Date(row.event_time).getTime() / 1000),
    event_id: `sd-${row.id}`, // Meta drops a second event with the same id (dedup)
    action_source: "system_generated",
    user_data: userData(lead?.phone ?? "", lead?.email ?? ""),
    custom_data: custom,
  };
}

/** Send waiting Meta events. Called after every lead change (in the background) and by the cron job.
 *  retryFailed also picks failed rows with fewer than 5 attempts; force (admin button) ignores the cap. */
export async function flushMetaEvents(opts?: {
  limit?: number;
  retryFailed?: boolean;
  force?: boolean;
}): Promise<{ sent: number; failed: number }> {
  const db = createAdminClient();
  const cfg = await loadConfig(db);
  if (!cfg) return { sent: 0, failed: 0 };

  let q = db
    .from("meta_events")
    .select("id, stage, event_name, value, event_time, attempts, leads(phone, email)")
    .order("created_at")
    .order("id")
    .limit(Math.min(Math.max(opts?.limit ?? BATCH_LIMIT, 1), BATCH_LIMIT));
  if (opts?.retryFailed && opts.force) q = q.in("status", ["pending", "failed"]);
  else if (opts?.retryFailed) q = q.or(`status.eq.pending,and(status.eq.failed,attempts.lt.${MAX_ATTEMPTS})`);
  else q = q.eq("status", "pending");

  const { data, error } = await q;
  if (error || !data?.length) return { sent: 0, failed: 0 };
  const rows = data as unknown as EventRow[];

  // One request for the whole batch. If Meta rejects it, send one by one so a single
  // bad row does not hold back the others.
  const results = new Map<number, string | null>();
  const batchError = await postEvents(cfg, rows.map(toEvent), cfg.testCode);
  if (batchError === null || rows.length === 1) {
    for (const r of rows) results.set(r.id, batchError);
  } else {
    for (const r of rows) results.set(r.id, await postEvents(cfg, [toEvent(r)], cfg.testCode));
  }

  const sentIds = rows.filter((r) => results.get(r.id) === null).map((r) => r.id);
  if (sentIds.length) {
    await db
      .from("meta_events")
      .update({ status: "sent", sent_at: new Date().toISOString(), error: "" })
      .in("id", sentIds);
  }
  const failedRows = rows.filter((r) => results.get(r.id) !== null);
  await Promise.all(
    failedRows.map((r) =>
      db
        .from("meta_events")
        .update({ status: "failed", attempts: r.attempts + 1, error: results.get(r.id) ?? "" })
        .eq("id", r.id),
    ),
  );
  return { sent: sentIds.length, failed: failedRows.length };
}

/** The "ทดสอบส่ง" button in Settings. Sends one event with the test event code, so it shows
 *  up only under Test events and never counts in ad results.
 *  It is sent as a website event on purpose: Events Manager > Test events does not list
 *  system_generated events (the kind real stage changes use) even though Meta accepts them,
 *  so a system_generated test would look like a failure. A website event needs the page URL
 *  and the browser's user agent. */
export async function sendTestEvent(page: { url: string; userAgent: string }): Promise<{ ok: boolean; message: string }> {
  const db = createAdminClient();
  const cfg = await loadConfig(db);
  if (!cfg) return { ok: false, message: "ยังไม่ได้ใส่ Pixel ID หรือ token ให้ครบ บันทึกทั้งสองช่องก่อนแล้วกดทดสอบอีกครั้ง" };
  if (!cfg.testCode) {
    return {
      ok: false,
      message: "ยังไม่ได้ใส่รหัสทดสอบ (Test event code) คัดลอกจาก Events Manager > Test events แล้วบันทึกก่อนกดทดสอบ",
    };
  }
  const err = await postEvents(
    cfg,
    [
      {
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_id: `sd-test-${Date.now()}`,
        action_source: "website",
        event_source_url: page.url,
        user_data: { ...userData("0800000000", "test@example.com"), client_user_agent: page.userAgent || "SalesDesk" },
        custom_data: { lead_stage: "new" },
      },
    ],
    cfg.testCode,
  );
  if (err) return { ok: false, message: `Meta ไม่รับข้อมูล: ${err}` };
  return {
    ok: true,
    message:
      "Meta รับแล้ว ดูที่ Events Manager > Pixel ของบริษัท > Test events จะเห็น Lead (ต้องเปิดหน้านั้นค้างไว้ก่อนกดส่ง ถ้ายังไม่เห็นให้กดทดสอบอีกครั้ง)",
  };
}
