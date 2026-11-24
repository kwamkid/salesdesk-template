"use client";

/**
 * <DataTable> — every list table of the app (aoo-techstack/ui/DATATABLE.md, light variant +
 * column settings from aoocommerce components/ui/DataTable.tsx).
 *
 *  - A real table from `breakpoint` (default lg = 1024px); below it one card per row.
 *    Default card = "label : value" per column (`hideMobile`, `mobileRender` per column),
 *    or draw the whole card with `mobileCardRender`.
 *  - Sorting: `sortable` columns, click the header: ascending → descending → off.
 *    Sorts the rows already loaded (Thai collation, empty values last). `sortValue` when the
 *    raw field is not what should be compared.
 *  - Rows: `rowHref` (link, on the table and the cards) or `onRowClick`.
 *  - `storageKey`: a "คอลัมน์" button to hide/show columns, remembered in this browser.
 *  - Empty state on both the table and the cards.
 *
 * Column render functions make this a client component: build `columns` in a "use client" file.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { SortAscIcon, SortDescIcon, SortNoneIcon } from "@/lib/icons";
import { Popover } from "./popover";

export interface DataTableColumn<T> {
  /** Field name in the row; also the React key and the default value to show / sort. */
  key: string;
  header: ReactNode;
  /** Plain-text header for the cards and the column menu when `header` is not a string. */
  label?: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  /** Value to sort by (default row[key]). */
  sortValue?: (row: T) => string | number | null | undefined;
  align?: "left" | "right" | "center";
  /** e.g. 120 or "20%" */
  width?: string | number;
  /** Extra classes on the <td> */
  className?: string;
  /** Cards: show something else than `render` */
  mobileRender?: (row: T) => ReactNode;
  /** Cards: leave this column out */
  hideMobile?: boolean;
  /** Column menu: this column cannot be hidden (default true for the first column). */
  hideable?: boolean;
  /** Column menu: hidden until the user turns it on. */
  defaultHidden?: boolean;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  /** Unique field of a row, or a function. */
  rowKey: keyof T | ((row: T) => string);
  rowHref?: (row: T) => string | undefined;
  onRowClick?: (row: T) => void;
  /** Extra classes per row (e.g. a highlighted row). On phone cards they replace the white
   *  background, so include a bg-* class (e.g. "bg-danger-soft"). */
  rowClassName?: (row: T) => string;
  emptyState?: ReactNode;
  mobileCardRender?: (row: T) => ReactNode;
  /** Table from this width; cards below. Default "lg". */
  breakpoint?: "md" | "lg";
  /** Remember hidden columns per page (e.g. "salesdesk.leads"). Shows the "คอลัมน์" button. */
  storageKey?: string;
  initialSort?: { key: string; direction: "asc" | "desc" };
  /** Under the table and the cards (e.g. a "โหลดเพิ่ม" button). */
  footer?: ReactNode;
  /** Name of the table for screen readers */
  caption?: string;
  className?: string;
}

type Sort = { key: string | null; direction: "asc" | "desc" };

const raw = <T,>(row: T, key: string): unknown => (row as Record<string, unknown>)[key];

function compare(a: unknown, b: unknown, dir: 1 | -1): number {
  const empty = (v: unknown) => v == null || v === "";
  if (empty(a) && empty(b)) return 0;
  if (empty(a)) return 1;
  if (empty(b)) return -1;
  if (typeof a === "number" && typeof b === "number") return (a - b) * dir;
  return String(a).localeCompare(String(b), "th", { numeric: true }) * dir;
}

const textOf = (h: ReactNode, fallback: string) => (typeof h === "string" ? h : fallback);

function readHidden(key: string): string[] | null {
  try {
    const v = localStorage.getItem(`datatable:${key}`);
    return v ? (JSON.parse(v) as string[]) : null;
  } catch {
    return null;
  }
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  rowHref,
  onRowClick,
  rowClassName,
  emptyState,
  mobileCardRender,
  breakpoint = "lg",
  storageKey,
  initialSort,
  footer,
  caption,
  className = "",
}: DataTableProps<T>) {
  const router = useRouter();
  const [sort, setSort] = useState<Sort>(initialSort ?? { key: null, direction: "asc" });

  // Hidden columns: start from the code defaults (same on server and client), then read the
  // user's choice after mount so the first render matches the server HTML.
  const defaults = useMemo(() => columns.filter((c) => c.defaultHidden).map((c) => c.key), [columns]);
  const [hidden, setHidden] = useState<string[]>(defaults);
  useEffect(() => {
    if (!storageKey) return;
    const saved = readHidden(storageKey);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage exists only after mount
    if (saved) setHidden(saved);
  }, [storageKey]);
  const saveHidden = (next: string[]) => {
    setHidden(next);
    if (!storageKey) return;
    try {
      localStorage.setItem(`datatable:${storageKey}`, JSON.stringify(next));
    } catch {
      // private mode: keep it for this visit only
    }
  };

  const visible = columns.filter((c) => !hidden.includes(c.key));

  const keyOf = (row: T) => (typeof rowKey === "function" ? rowKey(row) : String(row[rowKey]));

  const sorted = useMemo(() => {
    if (!sort.key) return data;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return data;
    const get = col.sortValue ?? ((r: T) => raw(r, col.key));
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...data].sort((a, b) => compare(get(a), get(b), dir));
  }, [data, sort, columns]);

  const toggleSort = (key: string) =>
    setSort((p) =>
      p.key !== key ? { key, direction: "asc" } : p.direction === "asc" ? { key, direction: "desc" } : { key: null, direction: "asc" },
    );

  const cell = (col: DataTableColumn<T>, row: T) =>
    col.render ? col.render(row) : ((raw(row, col.key) as ReactNode) ?? "-");

  const clickable = Boolean(rowHref || onRowClick);
  const activate = (row: T) => {
    if (onRowClick) onRowClick(row);
    else {
      const href = rowHref?.(row);
      if (href) router.push(href);
    }
  };

  const tableShow = breakpoint === "md" ? "hidden md:block" : "hidden lg:block";
  const cardShow = breakpoint === "md" ? "md:hidden" : "lg:hidden";
  const empty = <div className="px-4 py-10 text-center text-sm text-ink-soft">{emptyState ?? "ไม่มีข้อมูล"}</div>;

  return (
    <div className={`flex min-w-0 flex-col gap-2 ${className}`}>
      {storageKey && <ColumnMenu columns={columns} hidden={hidden} onChange={saveHidden} className={tableShow} />}

      <div className={`${tableShow} overflow-x-auto rounded-card border border-line bg-surface shadow-card`}>
        <table className="w-full border-collapse text-left text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="bg-bg text-ink-soft">
            <tr>
              {visible.map((col) => {
                const active = sort.key === col.key;
                const align = col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "";
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={`border-b border-line px-4 py-3 font-medium whitespace-nowrap ${align}`}
                    style={col.width != null ? { width: col.width } : undefined}
                    aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : undefined}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className={`-mx-1 inline-flex min-h-8 items-center gap-1 rounded px-1 transition-colors select-none hover:text-ink ${
                          active ? "font-semibold text-ink" : ""
                        } ${col.align === "right" ? "flex-row-reverse" : ""}`}
                      >
                        <span>{col.header}</span>
                        {active ? (
                          sort.direction === "asc" ? (
                            <SortAscIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          ) : (
                            <SortDescIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          )
                        ) : (
                          <SortNoneIcon className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={visible.length}>{empty}</td>
              </tr>
            ) : (
              sorted.map((row) => (
                <tr
                  key={keyOf(row)}
                  onClick={
                    clickable
                      ? (e) => {
                          // Buttons, links and menus inside the row keep their own job.
                          if ((e.target as HTMLElement).closest("a,button,input,label,[role=button],[role=switch]")) return;
                          activate(row);
                        }
                      : undefined
                  }
                  className={`border-b border-line last:border-b-0 ${clickable ? "cursor-pointer hover:bg-bg" : ""} ${rowClassName?.(row) ?? ""}`}
                >
                  {visible.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 align-middle ${
                        col.align === "right" ? "text-right tabular-nums" : col.align === "center" ? "text-center" : ""
                      } ${col.className ?? ""}`}
                    >
                      {cell(col, row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className={cardShow}>
        {sorted.length === 0 ? (
          <div className="rounded-card border border-line bg-surface">{empty}</div>
        ) : (
          <ul className="flex flex-col gap-2">
            {sorted.map((row) => {
              const body = mobileCardRender ? (
                mobileCardRender(row)
              ) : (
                <dl className="flex flex-col gap-1.5">
                  {visible
                    .filter((c) => !c.hideMobile)
                    .map((col) => (
                      <div key={col.key} className="flex items-start justify-between gap-3">
                        <dt className="shrink-0 text-sm text-ink-soft">{col.label ?? textOf(col.header, col.key)}</dt>
                        <dd className="min-w-0 text-right text-base break-words">
                          {col.mobileRender ? col.mobileRender(row) : cell(col, row)}
                        </dd>
                      </div>
                    ))}
                </dl>
              );
              const href = rowHref?.(row);
              // A row class replaces the card background (two bg-* classes would fight), so give it its own bg-*.
              const cls = `block rounded-card border border-line p-4 shadow-card ${rowClassName?.(row) || "bg-surface"}`;
              return (
                <li key={keyOf(row)}>
                  {href && !onRowClick ? (
                    <Link href={href} className={`${cls} transition-colors hover:border-line-strong`}>
                      {body}
                    </Link>
                  ) : onRowClick ? (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest("a,button,input,label,[role=switch]")) return;
                        onRowClick(row);
                      }}
                      onKeyDown={(e) => {
                        if (e.target !== e.currentTarget) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onRowClick(row);
                        }
                      }}
                      className={`${cls} cursor-pointer transition-colors hover:border-line-strong`}
                    >
                      {body}
                    </div>
                  ) : (
                    <div className={cls}>{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {footer}
    </div>
  );
}

/** "คอลัมน์" button: tick the columns to show. The first column always stays. */
function ColumnMenu<T>({
  columns,
  hidden,
  onChange,
  className,
}: {
  columns: DataTableColumn<T>[];
  hidden: string[];
  onChange: (hidden: string[]) => void;
  className: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <div className={`${className} self-end`}>
      <button
        ref={ref}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line-strong bg-surface px-3 text-sm font-medium hover:bg-bg"
      >
        คอลัมน์
        {hidden.length > 0 && <span className="text-ink-soft">(ซ่อน {hidden.length})</span>}
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref} width={240} ariaLabel="เลือกคอลัมน์ที่แสดง">
        <p className="mb-1 text-sm font-semibold">คอลัมน์ที่แสดง</p>
        <ul className="flex flex-col">
          {columns.map((c, i) => {
            const locked = c.hideable === false || (c.hideable === undefined && i === 0);
            const on = !hidden.includes(c.key);
            return (
              <li key={c.key}>
                <label className={`flex min-h-11 items-center gap-3 text-base ${locked ? "text-ink-soft" : ""}`}>
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-brand"
                    checked={on}
                    disabled={locked}
                    onChange={() => onChange(on ? [...hidden, c.key] : hidden.filter((k) => k !== c.key))}
                  />
                  {c.label ?? textOf(c.header, c.key)}
                </label>
              </li>
            );
          })}
        </ul>
        {hidden.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="mt-1 min-h-11 text-sm font-medium text-brand hover:underline">
            แสดงทุกคอลัมน์
          </button>
        )}
      </Popover>
    </div>
  );
}
