"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { createClient } from "@/lib/supabase/client";

/** The layout stays mounted between pages, so the unread number is refreshed on each page change. */
export function BellLink({ userId, initialUnread }: { userId: string; initialUnread: number }) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(initialUnread);
  const onPage = pathname === "/notifications";
  const shown = onPage ? 0 : unread; // opening the page marks everything read

  useEffect(() => {
    if (onPage) return;
    let live = true;
    createClient()
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null)
      .then(({ count }) => {
        if (live && typeof count === "number") setUnread(count);
      });
    return () => {
      live = false;
    };
  }, [pathname, onPage, userId]);

  return (
    <Tooltip text={shown ? `แจ้งเตือน ${shown} รายการใหม่` : "แจ้งเตือน"} position="bottom">
    <Link
      href="/notifications"
      aria-label={shown ? `แจ้งเตือน มี ${shown} รายการใหม่` : "แจ้งเตือน"}
      aria-current={onPage ? "page" : undefined}
      className={`relative flex min-h-11 min-w-11 items-center justify-center rounded-control ${onPage ? "text-brand" : "text-ink-soft"}`}
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0" />
      </svg>
      {shown > 0 && (
        <span
          aria-hidden
          className="absolute top-1 right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-xs font-medium text-white"
        >
          {shown > 9 ? "9+" : shown}
        </span>
      )}
    </Link>
    </Tooltip>
  );
}
