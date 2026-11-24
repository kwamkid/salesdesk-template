"use client";

import { useEffect, useState, useTransition } from "react";
import { sendTestPush, type ActionResult } from "@/app/(app)/me/actions";
import { isIos, isStandalone } from "@/components/pwa/install-card";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

type Status = "checking" | "unsupported" | "ios-install" | "denied" | "off" | "on";

const STATUS_TEXT: Record<Status, string> = {
  checking: "กำลังตรวจสอบ",
  unsupported: "เบราว์เซอร์นี้รับแจ้งเตือนไม่ได้ ลองเปิดด้วย Chrome (Android) หรือ Safari (iPhone)",
  "ios-install": "iPhone ต้องติดตั้งแอปลงหน้าจอโฮมก่อน (iOS 16.4 ขึ้นไป) แล้วเปิดแอปจากไอคอน จึงจะเปิดการแจ้งเตือนได้",
  denied: "เครื่องนี้ปิดการแจ้งเตือนของแอปไว้ เปิดได้ที่การตั้งค่าของเครื่อง > การแจ้งเตือน",
  off: "ยังไม่ได้เปิดการแจ้งเตือนบนเครื่องนี้",
  on: "เครื่องนี้รับแจ้งเตือนแล้ว",
};

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function detect(): Promise<Status> {
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!supported) return isIos() && !isStandalone() ? "ios-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

/** "การแจ้งเตือน" on /me: turn push on or off for this device and send a test message. */
export function PushSettings() {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ActionResult>(null);
  const [testing, startTest] = useTransition();

  useEffect(() => {
    let live = true;
    detect()
      .then((s) => live && setStatus(s))
      .catch(() => live && setStatus("unsupported"));
    return () => {
      live = false;
    };
  }, []);

  async function enable() {
    setBusy(true);
    setResult(null);
    try {
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) throw new Error("ระบบยังไม่ได้ตั้งค่ากุญแจแจ้งเตือน (VAPID) แจ้งแอดมิน");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) }));
      const json = sub.toJSON();
      const { error } = await createClient()
        .from("push_subscriptions")
        .upsert(
          {
            endpoint: sub.endpoint,
            p256dh: json.keys?.p256dh ?? "",
            auth: json.keys?.auth ?? "",
            user_agent: navigator.userAgent.slice(0, 300),
          },
          { onConflict: "endpoint" },
        );
      if (error) throw new Error("บันทึกเครื่องนี้ไม่สำเร็จ ลองใหม่อีกครั้ง");
      setStatus("on");
      setResult({ ok: true, message: "เปิดการแจ้งเตือนแล้ว ลองกด \"ส่งทดสอบ\"" });
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error && /[ก-๙]/.test(e.message) ? e.message : "เปิดการแจ้งเตือนไม่สำเร็จ ลองใหม่อีกครั้ง" });
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setResult(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await createClient().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("off");
      setResult({ ok: true, message: "ปิดการแจ้งเตือนบนเครื่องนี้แล้ว" });
    } catch {
      setResult({ ok: false, message: "ปิดไม่สำเร็จ ลองใหม่อีกครั้ง" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">
        <span className="font-medium">สถานะ: </span>
        {STATUS_TEXT[status]}
      </p>
      {status === "off" && (
        <Button full disabled={busy} onClick={enable}>
          {busy ? "กำลังเปิด" : "เปิดการแจ้งเตือน"}
        </Button>
      )}
      {status === "on" && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            full
            variant="secondary"
            disabled={testing}
            onClick={() => startTest(async () => setResult(await sendTestPush()))}
          >
            {testing ? "กำลังส่ง" : "ส่งทดสอบ"}
          </Button>
          <Button full variant="ghost" disabled={busy} onClick={disable}>
            ปิดการแจ้งเตือนบนเครื่องนี้
          </Button>
        </div>
      )}
      {result && <Notice tone={result.ok ? "ok" : "danger"}>{result.message}</Notice>}
    </div>
  );
}
