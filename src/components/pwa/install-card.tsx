"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { clearInstallPrompt, getInstallPrompt, INSTALL_EVENT } from "./app-boot";

/** True when the app runs from the home screen (no browser bar). */
export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export const isIos = () =>
  typeof navigator !== "undefined" &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

const noop = () => () => {};

/** "ติดตั้งแอปบนมือถือ" on /me. Hidden when the app is already installed. */
export function InstallCard() {
  // Read browser-only values after hydration to avoid a server/client mismatch.
  const standalone = useSyncExternalStore(noop, isStandalone, () => true);
  const ios = useSyncExternalStore(noop, isIos, () => false);
  const [canPrompt, setCanPrompt] = useState(false);

  useEffect(() => {
    const update = () => setCanPrompt(getInstallPrompt() !== null);
    update();
    window.addEventListener(INSTALL_EVENT, update);
    return () => window.removeEventListener(INSTALL_EVENT, update);
  }, []);

  if (standalone) return null;

  async function install() {
    const p = getInstallPrompt();
    if (!p) return;
    await p.prompt();
    await p.userChoice;
    clearInstallPrompt();
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">ติดตั้งแอปบนมือถือ</h2>
      <p className="text-sm text-ink-soft">เปิดจากไอคอนบนหน้าจอโฮมได้เหมือนแอปทั่วไป เต็มจอ และรับแจ้งเตือนได้</p>
      {canPrompt && (
        <Button full onClick={install}>
          ติดตั้งแอป
        </Button>
      )}

      <div className={`flex flex-col gap-1 ${ios ? "order-first" : ""}`}>
        <h3 className="font-medium">iPhone (Safari)</h3>
        <ol className="list-decimal pl-5 text-sm">
          <li>เปิดหน้านี้ด้วย Safari</li>
          <li>กดปุ่มแชร์ (สี่เหลี่ยมมีลูกศรชี้ขึ้น) ที่แถบล่าง</li>
          <li>เลื่อนลงแล้วกด &quot;เพิ่มไปยังหน้าจอโฮม&quot;</li>
          <li>กด &quot;เพิ่ม&quot; แล้วเปิดแอปจากไอคอนบนหน้าจอโฮม</li>
        </ol>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-medium">Android (Chrome)</h3>
        <ol className="list-decimal pl-5 text-sm">
          <li>เปิดหน้านี้ด้วย Chrome</li>
          <li>กดปุ่ม ⋮ มุมขวาบน</li>
          <li>กด &quot;ติดตั้งแอป&quot; (หรือ &quot;เพิ่มลงในหน้าจอหลัก&quot;)</li>
        </ol>
      </div>
    </Card>
  );
}
