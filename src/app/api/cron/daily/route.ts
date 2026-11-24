import { NextResponse } from "next/server";
import { isCronRequest } from "@/lib/cron";
import { flushMetaEvents } from "@/lib/meta";
import { bangkokToday, flushNotifications } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/server";

// cron-job.org calls this once a day (about 07:00 Bangkok) with  Authorization: Bearer <CRON_SECRET>
// 1. Send the Meta events that failed again.  2. Tell the admins about the ones that still fail.
export const maxDuration = 60;

async function daily(request: Request) {
  if (!isCronRequest(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let meta: { sent: number; failed: number } | { error: string };
  try {
    meta = await flushMetaEvents({ retryFailed: true });
  } catch (e) {
    console.error("[cron/daily] meta", e);
    meta = { error: e instanceof Error ? e.message : String(e) };
  }

  const admin = createAdminClient();
  const { count: failed } = await admin
    .from("meta_events")
    .select("id", { count: "exact", head: true })
    .eq("status", "failed");

  let notified = 0;
  if (failed) {
    const { data: admins } = await admin.from("profiles").select("id").eq("role", "admin").eq("status", "active").order("id");
    const today = bangkokToday();
    for (const a of admins ?? []) {
      const { error } = await admin.rpc("notify", {
        p_user: a.id,
        p_kind: "task",
        p_title: `ส่งข้อมูลไป Meta ไม่สำเร็จ ${failed} รายการ`,
        p_body: "กดเพื่อดูรายการและส่งใหม่",
        p_url: "/queue",
        p_dedupe: `metafail:${today}`,
      });
      if (error) console.error("[cron/daily] notify", error.message);
      else notified++;
    }
  }

  let push: { pushed: number } | { error: string };
  try {
    push = await flushNotifications();
  } catch (e) {
    push = { error: e instanceof Error ? e.message : String(e) };
  }

  return NextResponse.json({ ok: true, meta, failedLeft: failed ?? 0, adminsNotified: notified, push });
}

export const GET = daily;
export const POST = daily;
