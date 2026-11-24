import { AppBoot } from "@/components/pwa/app-boot";
import { createClient } from "@/lib/supabase/server";
import { BellLink } from "./bell-link";

/** Bell in the top bar with the number of unread notifications.
 *  Also mounts AppBoot (service worker, app icon number, background photo uploads). */
export async function NotificationBell({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  return (
    <>
      <BellLink userId={userId} initialUnread={count ?? 0} />
      <AppBoot />
    </>
  );
}
