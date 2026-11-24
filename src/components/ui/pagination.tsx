import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@/lib/icons";

/**
 * <Pagination> — page numbers under a list (same layout as the aoo apps' Pagination / PaginationNav).
 * Server-side: the page lives in ?page=, the server turns it into an RPC offset, so a list never
 * fetches more than one page (stays far under Supabase's 1,000-row limit).
 *
 * <Pagination page={2} pageSize={30} total={63} href={(p) => `/leads?${params}&page=${p}`} />
 */
export function Pagination({
  page,
  pageSize,
  total,
  href,
}: {
  page: number;
  pageSize: number;
  total: number;
  href: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const cur = Math.min(Math.max(1, page), pages);
  const from = (cur - 1) * pageSize + 1;
  const to = Math.min(cur * pageSize, total);

  // 1 … 4 5 [6] 7 8 … 20
  const nums: (number | "gap")[] = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - cur) <= 2) nums.push(p);
    else if (nums[nums.length - 1] !== "gap") nums.push("gap");
  }

  const box = "flex h-11 min-w-11 items-center justify-center rounded-control px-2 text-sm transition-colors";
  const arrow = (target: number, label: string, Icon: typeof ChevronLeftIcon, off: boolean) =>
    off ? (
      <span className={`${box} text-ink-soft opacity-40`} aria-hidden>
        <Icon className="h-4 w-4" />
      </span>
    ) : (
      <Link href={href(target)} scroll={false} aria-label={label} className={`${box} text-ink hover:bg-bg`}>
        <Icon className="h-4 w-4" aria-hidden />
      </Link>
    );

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm text-ink-soft">
        {from.toLocaleString("th-TH")}–{to.toLocaleString("th-TH")} จาก {total.toLocaleString("th-TH")} ราย
      </span>
      <nav aria-label="เปลี่ยนหน้า" className="flex items-center gap-1">
        {arrow(cur - 1, "หน้าก่อน", ChevronLeftIcon, cur === 1)}
        <span className="px-2 text-sm text-ink-soft sm:hidden">
          หน้า {cur} / {pages}
        </span>
        <span className="hidden items-center gap-1 sm:flex">
          {nums.map((n, i) =>
            n === "gap" ? (
              <span key={`g${i}`} className="min-w-6 text-center text-sm text-ink-soft" aria-hidden>
                …
              </span>
            ) : (
              <Link
                key={n}
                href={href(n)}
                scroll={false}
                aria-current={n === cur ? "page" : undefined}
                aria-label={`หน้า ${n}`}
                className={`${box} ${n === cur ? "bg-brand font-semibold text-brand-ink" : "text-ink hover:bg-bg"}`}
              >
                {n}
              </Link>
            ),
          )}
        </span>
        {arrow(cur + 1, "หน้าถัดไป", ChevronRightIcon, cur === pages)}
      </nav>
    </div>
  );
}
