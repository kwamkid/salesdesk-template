import Link from "next/link";
import { Badge } from "@/components/ui/card";
import { thDateTime } from "@/lib/format";

export type NotificationRow = {
  id: number;
  kind: "task" | "info";
  title: string;
  body: string;
  url: string;
  read_at: string | null;
  created_at: string;
};

export const NOTIFICATION_COLUMNS = "id, kind, title, body, url, read_at, created_at";
export const NOTIFICATIONS_PAGE = 30;

/** One row of the /notifications list. Unread rows are tinted and carry the word "ใหม่".
 *  Phones: small card. md+: one compact row, time on the right. */
export function NotificationItem({ n, unread }: { n: NotificationRow; unread: boolean }) {
  return (
    <li>
      <Link
        href={n.url || "/"}
        className={`flex min-h-11 flex-col gap-1 rounded-card border p-3 md:flex-row md:items-center md:gap-4 md:py-2 ${
          unread ? "border-brand bg-brand-soft" : "border-line bg-surface hover:bg-bg"
        }`}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-start justify-between gap-2 md:justify-start">
            <span className="font-medium">{n.title}</span>
            {unread && <Badge tone="brand">ใหม่</Badge>}
          </span>
          {n.body && <span className="text-sm break-words text-ink-soft">{n.body}</span>}
        </span>
        <span className="text-xs text-ink-soft md:shrink-0 md:whitespace-nowrap">{thDateTime(n.created_at)}</span>
      </Link>
    </li>
  );
}

/** The page stamps read_at = openedAt on every unread row when it opens.
 *  A row read at that moment (or still unread) was new to this visit. */
export const wasUnread = (n: NotificationRow, openedAt: string) =>
  n.read_at === null || new Date(n.read_at).getTime() >= new Date(openedAt).getTime();
