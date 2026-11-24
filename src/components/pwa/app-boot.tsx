"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { runUploadQueue, usePendingUploads } from "@/lib/photo-upload";
import { createClient } from "@/lib/supabase/client";

// The "beforeinstallprompt" event fires once, early, on Android/Chrome. Keep it here so the
// install button on /me can use it later. Read it with getInstallPrompt().
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let installPrompt: InstallPromptEvent | null = null;
export const INSTALL_EVENT = "salesdesk:install-prompt";
export const getInstallPrompt = () => installPrompt;
export const clearInstallPrompt = () => {
  installPrompt = null;
  window.dispatchEvent(new Event(INSTALL_EVENT));
};

/** Number on the app icon = work still to do (badge_count in the database). */
export async function syncAppBadge() {
  const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
  if (!nav.setAppBadge) return;
  const { data, error } = await createClient().rpc("badge_count");
  if (error || typeof data !== "number") return;
  await (data > 0 ? nav.setAppBadge(data) : nav.clearAppBadge?.());
}

/** Mounted once in the signed-in layout (through NotificationBell):
 *  registers the service worker, keeps the icon number fresh, resumes photo uploads. */
export function AppBoot() {
  const uploading = usePendingUploads().length;
  const router = useRouter();
  const wasUploading = useRef(0);

  // When the last photo has been sent, reload the page data so the photo shows in the timeline.
  useEffect(() => {
    if (wasUploading.current > 0 && uploading === 0) router.refresh();
    wasUploading.current = uploading;
  }, [uploading, router]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((e) => {
        console.error("[pwa] service worker", e);
      });
    }

    const onInstall = (e: Event) => {
      e.preventDefault();
      installPrompt = e as InstallPromptEvent;
      window.dispatchEvent(new Event(INSTALL_EVENT));
    };
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void syncAppBadge().catch(() => {});
      void runUploadQueue();
    };
    const onOnline = () => void runUploadQueue();

    window.addEventListener("beforeinstallprompt", onInstall);
    window.addEventListener("appinstalled", clearInstallPrompt);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    onVisible();
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstall);
      window.removeEventListener("appinstalled", clearInstallPrompt);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  if (!uploading) return null;
  // Sits above the bottom menu on phones.
  return (
    <p
      role="status"
      className="fixed inset-x-4 bottom-20 z-20 mx-auto flex max-w-sm items-center justify-center gap-2 rounded-full
        bg-ink px-4 py-2 text-sm text-surface md:bottom-6"
    >
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-surface/40 border-t-surface" aria-hidden />
      กำลังอัปโหลดรูป {uploading} รูป
    </p>
  );
}
