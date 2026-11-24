// Server only. Sends Web Push messages and creates the daily digest and appointment reminders.
// Called by the cron jobs (src/app/api/cron/*) and, right after a change, by afterLeadChange().
import { sendNotification, setVapidDetails, type PushSubscription } from "web-push";
import type { Role } from "@/config/roles";
import { STAGES } from "@/config/stages";
import { createAdminClient } from "@/lib/supabase/server";

const TZ = "Asia/Bangkok";
const OPEN_STAGES = STAGES.filter((s) => s.open).map((s) => s.key);

/** Digest hour for users who never opened the settings (no notification_prefs row). */
const DEFAULT_DIGEST_HOUR: Record<Role, number> = { sales: 8, executive: 18, admin: 8 };

type Admin = ReturnType<typeof createAdminClient>;

type Prefs = {
  user_id: string;
  daily_digest: boolean;
  digest_hour: number;
  instant: boolean;
  quiet_from: number | null;
  quiet_to: number | null;
  project_ids: string[] | null;
  last_digest_on: string | null;
};

type Row = { id: number; user_id: string; title: string; body: string; url: string; created_at: string };
type Sub = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string };

/** Payload read by public/sw.js. */
export type PushPayload = { title: string; body: string; url: string; badge?: number; tag?: string };

// ---------------------------------------------------------------------------
// Bangkok time helpers
// ---------------------------------------------------------------------------
const bangkokDate = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: TZ }); // YYYY-MM-DD
const bangkokHour = (d: Date) =>
  Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" }).format(d));
const bangkokTime = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
/** Midnight in Bangkok as an ISO timestamp, for "created today" filters. */
const bangkokDayStart = (iso: string) => `${iso}T00:00:00+07:00`;

/** Quiet hours wrap past midnight, e.g. 21 -> 7 means 21:00-06:59. */
function inQuietHours(p: Pick<Prefs, "quiet_from" | "quiet_to"> | undefined, hour: number) {
  if (!p || p.quiet_from === null || p.quiet_to === null || p.quiet_from === p.quiet_to) return false;
  return p.quiet_from < p.quiet_to ? hour >= p.quiet_from && hour < p.quiet_to : hour >= p.quiet_from || hour < p.quiet_to;
}

// ---------------------------------------------------------------------------
// Web Push
// ---------------------------------------------------------------------------
let vapidReady: boolean | null = null;

/** False until NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT are set. */
export function hasPushKeys() {
  if (vapidReady !== null) return vapidReady;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const priv = process.env.VAPID_PRIVATE_KEY ?? "";
  const subject = process.env.VAPID_SUBJECT ?? "";
  if (!pub || !priv || !subject) return (vapidReady = false);
  try {
    setVapidDetails(subject, pub, priv);
    vapidReady = true;
  } catch (e) {
    console.error("[push] VAPID keys are invalid", e);
    vapidReady = false;
  }
  return vapidReady;
}

/** One message for several notifications: "[โครงการ A] ลีดใหม่ 3 ราย". */
function mergeMessages(items: Row[]): Omit<PushPayload, "badge"> {
  const first = items[0];
  if (items.length === 1) return { title: first.title, body: first.body, url: first.url, tag: `n${first.id}` };

  // "[A] ลีดใหม่: คุณสมชาย" -> topic "[A] ลีดใหม่", detail "คุณสมชาย"
  const split = items.map((i) => {
    const at = i.title.indexOf(": ");
    return at > 0 ? { topic: i.title.slice(0, at), detail: i.title.slice(at + 2) } : { topic: i.title, detail: "" };
  });
  const sameTopic = split.every((s) => s.topic === split[0].topic);
  const title = sameTopic ? `${split[0].topic} ${items.length} ราย` : `แจ้งเตือนใหม่ ${items.length} รายการ`;
  const parts = sameTopic ? split.map((s) => s.detail || s.topic) : items.map((i) => i.title);
  const body = parts.slice(0, 3).join(" · ") + (parts.length > 3 ? ` และอีก ${parts.length - 3}` : "");
  return { title, body, url: first.url, tag: "summary" };
}

/** Send one payload to every device of a user. Deletes devices the browser has dropped (404/410).
 *  Returns true when at least one device got it, or there is nothing left worth retrying. */
async function sendToUser(admin: Admin, subs: Sub[], payload: PushPayload) {
  if (subs.length === 0) return { delivered: false, retry: false };
  const gone: string[] = [];
  let delivered = false;
  let retry = false;
  await Promise.all(
    subs.map(async (s) => {
      const sub: PushSubscription = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
      try {
        await sendNotification(sub, JSON.stringify(payload), { TTL: 60 * 60 * 12, urgency: "normal" });
        delivered = true;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.push(s.id);
        else {
          retry = true;
          console.error("[push] send failed", status, (e as Error).message);
        }
      }
    }),
  );
  if (gone.length) await admin.from("push_subscriptions").delete().in("id", gone);
  return { delivered, retry: retry && !delivered };
}

/** Push the notifications that have not been pushed yet (last 24 hours, 200 at a time),
 *  one merged message per user. Respects each user's settings:
 *  instant off -> marked as pushed without sending · quiet hours -> left for a later run.
 *  `opts` is for the "ส่งทดสอบ" button: only this user, ignoring their settings. */
export async function flushNotifications(opts?: { userId?: string; force?: boolean }): Promise<{ pushed: number }> {
  if (!hasPushKeys()) return { pushed: 0 };
  const admin = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  let q = admin
    .from("notifications")
    .select("id, user_id, title, body, url, created_at")
    .is("pushed_at", null)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(200);
  if (opts?.userId) q = q.eq("user_id", opts.userId);
  const { data: rows, error } = await q;
  if (error) throw new Error(`[push] read notifications: ${error.message}`);
  if (!rows?.length) return { pushed: 0 };

  const byUser = new Map<string, Row[]>();
  for (const r of rows as Row[]) byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r]);
  const userIds = [...byUser.keys()];

  const [{ data: prefRows }, { data: subRows }] = await Promise.all([
    admin.from("notification_prefs").select("user_id, instant, quiet_from, quiet_to").in("user_id", userIds),
    admin.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth").in("user_id", userIds),
  ]);
  const prefs = new Map((prefRows ?? []).map((p) => [p.user_id as string, p as Prefs]));
  const subs = new Map<string, Sub[]>();
  for (const s of (subRows ?? []) as Sub[]) subs.set(s.user_id, [...(subs.get(s.user_id) ?? []), s]);

  const hour = bangkokHour(new Date());
  const done: number[] = [];
  let pushed = 0;

  await Promise.all(
    userIds.map(async (userId) => {
      const items = byUser.get(userId)!;
      const p = prefs.get(userId);
      if (!opts?.force) {
        if (p && p.instant === false) {
          done.push(...items.map((i) => i.id)); // kept in the in-app list, never pushed
          return;
        }
        if (inQuietHours(p, hour)) return; // try again after the quiet hours
      }

      // With the service role auth.uid() is null, so badge_count accepts any user.
      const { data: badge } = await admin.rpc("badge_count", { p_user: userId });
      const payload: PushPayload = { ...mergeMessages(items), badge: typeof badge === "number" ? badge : undefined };
      const r = await sendToUser(admin, subs.get(userId) ?? [], payload);
      if (r.delivered) pushed++;
      if (!r.retry) done.push(...items.map((i) => i.id));
    }),
  );

  if (done.length) {
    const { error: upErr } = await admin.from("notifications").update({ pushed_at: new Date().toISOString() }).in("id", done);
    if (upErr) console.error("[push] mark pushed", upErr.message);
  }
  return { pushed };
}

// ---------------------------------------------------------------------------
// Daily digest
// ---------------------------------------------------------------------------
type Digest = { title: string; body: string; url: string } | null;

async function countOf(query: PromiseLike<{ count: number | null; error: { message: string } | null }>) {
  const { count, error } = await query;
  if (error) throw new Error(`[digest] ${error.message}`);
  return count ?? 0;
}

async function salesDigest(admin: Admin, userId: string, today: string): Promise<Digest> {
  const base = () =>
    admin.from("leads").select("id", { count: "exact", head: true }).eq("owner_id", userId).in("stage", OPEN_STAGES);
  const [dueToday, overdue] = await Promise.all([
    countOf(base().eq("next_follow_up", today)),
    countOf(base().lt("next_follow_up", today)),
  ]);
  if (dueToday + overdue === 0) return null;
  return {
    title: `วันนี้ต้องตาม ${dueToday} ราย · เลยกำหนด ${overdue} ราย`,
    body: "กดเพื่อดูรายการลูกค้าที่ต้องตามวันนี้",
    url: "/today",
  };
}

/** Projects an executive hears about: their chosen list, else the projects they look after, else all (null). */
async function executiveProjects(admin: Admin, userId: string, chosen: string[] | null) {
  if (chosen && chosen.length) return chosen;
  const { data } = await admin.from("project_members").select("project_id").eq("user_id", userId);
  const ids = (data ?? []).map((m) => m.project_id as string);
  return ids.length ? ids : null;
}

async function executiveDigest(admin: Admin, userId: string, today: string, chosen: string[] | null): Promise<Digest> {
  const projects = await executiveProjects(admin, userId, chosen);
  const start = bangkokDayStart(today);

  const leads = () => {
    const q = admin.from("leads").select("id", { count: "exact", head: true });
    return projects ? q.in("project_id", projects) : q;
  };
  // Moves into a stage today. stage_history has no project column, so filter through the lead.
  const moves = (stage: string) => {
    const q = admin
      .from("stage_history")
      .select("id, leads!inner(project_id)", { count: "exact", head: true })
      .eq("to_stage", stage)
      .gte("changed_at", start);
    return projects ? q.in("leads.project_id", projects) : q;
  };

  const [newLeads, appointments, reservations, overdue] = await Promise.all([
    countOf(leads().gte("created_at", start)),
    countOf(moves("appointment")),
    countOf(moves("reserved")),
    countOf(leads().in("stage", OPEN_STAGES).lt("next_follow_up", today)),
  ]);
  if (newLeads + appointments + reservations + overdue === 0) return null;
  return {
    title: `สรุปวันนี้: ลีดใหม่ ${newLeads} · นัดชม ${appointments} · จอง ${reservations} · งานเลยกำหนดทั้งทีม ${overdue}`,
    body: "กดเพื่อดูภาพรวมแยกรายโครงการ",
    url: "/overview",
  };
}

async function adminDigest(admin: Admin): Promise<Digest> {
  const [pending, failed] = await Promise.all([
    countOf(admin.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending")),
    countOf(admin.from("meta_events").select("id", { count: "exact", head: true }).eq("status", "failed")),
  ]);
  if (pending + failed === 0) return null;
  const parts = [pending && `ผู้ใช้รออนุมัติ ${pending} ราย`, failed && `ส่งข้อมูลไป Meta ไม่สำเร็จ ${failed} รายการ`].filter(Boolean);
  return { title: `งานรอ: ${parts.join(" · ")}`, body: "กดเพื่อเปิดหน้างานรอ", url: "/queue" };
}

/** Morning list for sales, evening summary for executives, waiting work for admins.
 *  Runs every 5 minutes from the tick cron; each user gets it once a day after their digest hour. */
export async function sendDigests(now = new Date()): Promise<{ sent: number; skipped: number }> {
  const admin = createAdminClient();
  const today = bangkokDate(now);
  const hour = bangkokHour(now);

  const [{ data: users, error }, { data: prefRows }] = await Promise.all([
    admin.from("profiles").select("id, role").eq("status", "active").order("id").limit(1000),
    admin.from("notification_prefs").select("*").order("user_id").limit(1000),
  ]);
  if (error) throw new Error(`[digest] read users: ${error.message}`);
  const prefs = new Map((prefRows ?? []).map((p) => [p.user_id as string, p as Prefs]));

  const due = (users ?? []).filter((u) => {
    const p = prefs.get(u.id);
    const daily = p ? p.daily_digest : true;
    const at = p ? p.digest_hour : DEFAULT_DIGEST_HOUR[u.role as Role];
    return daily && hour >= at && (!p?.last_digest_on || p.last_digest_on < today);
  });

  let sent = 0;
  let skipped = 0;
  // A few users at a time keeps the database calm.
  for (let i = 0; i < due.length; i += 5) {
    await Promise.all(
      due.slice(i, i + 5).map(async (u) => {
        const role = u.role as Role;
        const p = prefs.get(u.id);
        const digest =
          role === "sales"
            ? await salesDigest(admin, u.id, today)
            : role === "executive"
              ? await executiveDigest(admin, u.id, today, p?.project_ids ?? null)
              : await adminDigest(admin);

        if (digest) {
          const { error: nErr } = await admin.rpc("notify", {
            p_user: u.id,
            p_kind: "task",
            p_title: digest.title,
            p_body: digest.body,
            p_url: digest.url,
            p_dedupe: `digest:${u.id}:${today}`,
          });
          if (nErr) {
            console.error("[digest] notify", nErr.message);
            return; // try again on the next run
          }
          sent++;
        } else skipped++;

        // Remember today's digest. A new row keeps the role's default hour (the column default is 8).
        await admin
          .from("notification_prefs")
          .upsert(p ? { user_id: u.id, last_digest_on: today } : { user_id: u.id, digest_hour: DEFAULT_DIGEST_HOUR[role], last_digest_on: today }, {
            onConflict: "user_id",
          });
      }),
    );
  }
  return { sent, skipped };
}

// ---------------------------------------------------------------------------
// Appointment reminders
// ---------------------------------------------------------------------------
/** One hour before a site visit: "[โครงการ A] นัดชม 14:00 คุณสมชาย" to the lead's owner.
 *  The tick cron runs every 5 minutes, so the 50-70 minute window catches each visit once;
 *  the dedupe key stops a second reminder for the same time. */
export async function sendAppointmentReminders(now = new Date()): Promise<{ sent: number }> {
  const admin = createAdminClient();
  const from = new Date(now.getTime() + 50 * 60 * 1000).toISOString();
  const to = new Date(now.getTime() + 70 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from("leads")
    .select("id, full_name, owner_id, appointment_at, projects(name)")
    .gte("appointment_at", from)
    .lte("appointment_at", to)
    .in("stage", OPEN_STAGES)
    .not("owner_id", "is", null)
    .order("id")
    .limit(1000);
  if (error) throw new Error(`[appointments] ${error.message}`);

  let sent = 0;
  for (const l of data ?? []) {
    const project = (l.projects as unknown as { name: string } | null)?.name ?? "";
    const { error: nErr } = await admin.rpc("notify", {
      p_user: l.owner_id,
      p_kind: "task",
      p_title: `[${project}] นัดชม ${bangkokTime(new Date(l.appointment_at))} คุณ${String(l.full_name).replace(/^คุณ\s*/, "")}`,
      p_body: "กดเพื่อดูข้อมูลลูกค้าก่อนพาชม",
      p_url: `/leads/${l.id}`,
      p_dedupe: `appt:${l.id}:${l.appointment_at}`,
    });
    if (nErr) console.error("[appointments] notify", nErr.message);
    else sent++;
  }
  return { sent };
}

/** Bangkok date (YYYY-MM-DD) for dedupe keys in the cron routes. */
export const bangkokToday = (now = new Date()) => bangkokDate(now);
