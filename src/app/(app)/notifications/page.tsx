import { EmptyState, PageTitle } from "@/components/ui/card";
import { StatusTabs } from "@/components/ui/status-tabs";
import { MoreNotifications } from "@/components/notifications/more-notifications";
import {
  NOTIFICATION_COLUMNS,
  NOTIFICATIONS_PAGE,
  NotificationItem,
  wasUnread,
  type NotificationRow,
} from "@/components/notifications/notification-item";
import { requireMe } from "@/lib/auth";
import { NoNotificationsIcon } from "@/lib/icons";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "แจ้งเตือน" };

type Show = "all" | "unread" | "task" | "info";

/** The user's notifications, newest first, 30 at a time. Opening the page marks them all read.
 *  Tabs (?show=): ทั้งหมด · ยังไม่อ่าน (unread when this visit opened) · งาน · ข่าว. */
export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const me = await requireMe();
  const sp = await searchParams;
  const show: Show = sp.show === "unread" || sp.show === "task" || sp.show === "info" ? sp.show : "all";
  const supabase = await createClient();

  const count = (filter: (q: ReturnType<typeof base>) => ReturnType<typeof base>) => filter(base()).then((r) => r.count ?? 0);
  function base() {
    return supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", me.id);
  }

  let list = supabase.from("notifications").select(NOTIFICATION_COLUMNS).eq("user_id", me.id);
  if (show === "unread") list = list.is("read_at", null);
  if (show === "task" || show === "info") list = list.eq("kind", show);

  const [{ data }, total, unreadCount, taskCount, infoCount] = await Promise.all([
    list
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(0, NOTIFICATIONS_PAGE - 1),
    count((q) => q),
    count((q) => q.is("read_at", null)),
    count((q) => q.eq("kind", "task")),
    count((q) => q.eq("kind", "info")),
  ]);
  const rows = (data ?? []) as NotificationRow[];

  // Stamp every unread row with the same time, so "โหลดเพิ่ม" can still tell which were new.
  const openedAt = new Date().toISOString();
  if (unreadCount > 0) {
    await supabase.from("notifications").update({ read_at: openedAt }).eq("user_id", me.id).is("read_at", null);
  }

  return (
    <>
      <PageTitle title="แจ้งเตือน" sub="รายการล่าสุดอยู่บนสุด" />
      <StatusTabs
        activeKey={show}
        tabs={[
          { key: "all", label: "ทั้งหมด", count: total, href: "/notifications" },
          { key: "unread", label: "ยังไม่อ่าน", count: unreadCount, tone: "brand", href: "/notifications?show=unread", tooltip: "ที่ยังไม่ได้เปิดดูก่อนเข้าหน้านี้" },
          { key: "task", label: "งาน", count: taskCount, tone: "warn", href: "/notifications?show=task" },
          { key: "info", label: "ข่าว", count: infoCount, tone: "info", href: "/notifications?show=info" },
        ]}
      />
      {rows.length === 0 ? (
        show === "all" ? (
          <EmptyState icon={NoNotificationsIcon} tone="info" title="ยังไม่มีแจ้งเตือน" hint="เมื่อมีลีดใหม่ นัดชม หรือสรุปประจำวัน จะแสดงที่นี่" />
        ) : (
          <EmptyState icon={NoNotificationsIcon} tone="info" title="ไม่มีแจ้งเตือนในหมวดนี้" />
        )
      ) : (
        <>
          <ul className="flex flex-col gap-2 md:gap-1.5">
            {rows.map((n) => (
              <NotificationItem key={n.id} n={n} unread={wasUnread(n, openedAt)} />
            ))}
          </ul>
          {rows.length === NOTIFICATIONS_PAGE && (
            <MoreNotifications userId={me.id} offset={NOTIFICATIONS_PAGE} openedAt={openedAt} show={show} />
          )}
        </>
      )}
    </>
  );
}
