import { NextResponse } from "next/server";
import { isCronRequest } from "@/lib/cron";
import { flushMetaEvents } from "@/lib/meta";
import { flushNotifications, sendAppointmentReminders, sendDigests } from "@/lib/push";

// cron-job.org calls this every 5 minutes with  Authorization: Bearer <CRON_SECRET>
// Order matters: reminders and digests create notifications, the last step pushes them.
export const maxDuration = 60;

async function step<T>(name: string, run: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await run();
  } catch (e) {
    console.error(`[cron/tick] ${name}`, e);
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

async function tick(request: Request) {
  if (!isCronRequest(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const appointments = await step("appointments", () => sendAppointmentReminders());
  const digests = await step("digests", () => sendDigests());
  const meta = await step("meta", () => flushMetaEvents());
  const push = await step("push", () => flushNotifications());

  return NextResponse.json({ ok: true, appointments, digests, meta, push });
}

export const GET = tick;
export const POST = tick;
