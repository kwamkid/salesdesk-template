"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { NOTIFICATION_COLUMNS, NOTIFICATIONS_PAGE, NotificationItem, wasUnread, type NotificationRow } from "./notification-item";

/** "โหลดเพิ่ม" under the first 30 notifications. Loads the next 30 each tap (RLS: own rows only).
 *  openedAt = the read_at the page stamped on unread rows, so older ones still show as new. */
export function MoreNotifications({
  userId,
  offset,
  openedAt,
  show = "all",
}: {
  userId: string;
  offset: number;
  openedAt: string;
  /** The tab of the page: same filter for the next pages. */
  show?: "all" | "unread" | "task" | "info";
}) {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function loadMore() {
    setBusy(true);
    setFailed(false);
    const from = offset + rows.length;
    let q = createClient().from("notifications").select(NOTIFICATION_COLUMNS).eq("user_id", userId);
    // The page has stamped read_at = openedAt on the rows that were unread.
    if (show === "unread") q = q.or(`read_at.is.null,read_at.gte.${openedAt}`);
    if (show === "task" || show === "info") q = q.eq("kind", show);
    const { data, error } = await q
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + NOTIFICATIONS_PAGE - 1);
    setBusy(false);
    if (error) return setFailed(true);
    const next = (data ?? []) as NotificationRow[];
    setRows((r) => [...r, ...next]);
    if (next.length < NOTIFICATIONS_PAGE) setDone(true);
  }

  return (
    <>
      {rows.length > 0 && (
        <ul className="flex flex-col gap-2 md:gap-1.5">
          {rows.map((n) => (
            <NotificationItem key={n.id} n={n} unread={wasUnread(n, openedAt)} />
          ))}
        </ul>
      )}
      {failed && <Notice tone="danger">โหลดไม่สำเร็จ ลองใหม่อีกครั้ง</Notice>}
      {!done && (
        <Button variant="secondary" full disabled={busy} onClick={loadMore}>
          {busy ? "กำลังโหลด" : "โหลดเพิ่ม"}
        </Button>
      )}
    </>
  );
}
