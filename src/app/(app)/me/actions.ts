"use server";

import { revalidatePath } from "next/cache";
import { requireMe } from "@/lib/auth";
import { flushNotifications, hasPushKeys } from "@/lib/push";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: boolean; message: string } | null;

/** "ส่งทดสอบ": adds a notification for me and pushes it at once (ignores quiet hours). */
export async function sendTestPush(): Promise<ActionResult> {
  const me = await requireMe();
  if (!hasPushKeys()) return { ok: false, message: "ระบบยังไม่ได้ตั้งค่ากุญแจแจ้งเตือน (VAPID) แจ้งแอดมินให้ดูคู่มือการตั้งค่า" };

  // notify() is not granted to signed-in users, so the server adds it with the admin client.
  const admin = createAdminClient();
  const { error } = await admin.rpc("notify", {
    p_user: me.id,
    p_kind: "info",
    p_title: "ทดสอบการแจ้งเตือน",
    p_body: "ถ้าเห็นข้อความนี้ แปลว่าเครื่องนี้รับแจ้งเตือนได้แล้ว",
    p_url: "/notifications",
    p_dedupe: null,
  });
  if (error) return { ok: false, message: "ส่งไม่สำเร็จ ลองใหม่อีกครั้ง" };

  const { pushed } = await flushNotifications({ userId: me.id, force: true });
  return pushed > 0
    ? { ok: true, message: "ส่งแล้ว รอสักครู่ข้อความจะเด้งขึ้นที่เครื่อง" }
    : { ok: false, message: "ยังไม่มีเครื่องที่เปิดรับแจ้งเตือน กด \"เปิดการแจ้งเตือน\" ก่อน" };
}

const hourOrNull = (v: FormDataEntryValue | null) => {
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 23 ? n : null;
};

/** Notification settings of the signed-in user (RLS: own row only). */
export async function saveNotificationPrefs(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const me = await requireMe();
  const quietFrom = hourOrNull(form.get("quiet_from"));
  const quietTo = hourOrNull(form.get("quiet_to"));
  if ((quietFrom === null) !== (quietTo === null)) {
    return { ok: false, message: "ช่วงห้ามรบกวนต้องเลือกทั้งเวลาเริ่มและเวลาสิ้นสุด" };
  }

  const projects = form.getAll("project_ids").map(String).filter(Boolean);
  const supabase = await createClient();
  const { error } = await supabase.from("notification_prefs").upsert(
    {
      user_id: me.id,
      daily_digest: form.get("daily_digest") === "on",
      digest_hour: hourOrNull(form.get("digest_hour")) ?? 8,
      instant: form.get("instant") === "on",
      quiet_from: quietFrom,
      quiet_to: quietTo,
      // Executives only. None ticked = every project.
      ...(me.role === "executive" ? { project_ids: projects.length ? projects : null } : {}),
    },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, message: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง" };
  revalidatePath("/me");
  return { ok: true, message: "บันทึกการตั้งค่าแล้ว" };
}
