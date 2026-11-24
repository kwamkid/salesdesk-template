"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

export type StatColumn = { label: string };
export type StatRow = {
  key: string;
  title: ReactNode;
  cells: ReactNode[];
  href?: string;
  linkLabel?: string;
  /** Text to sort the title column by (default: not sortable by title) */
  sortTitle?: string;
  /** Numbers to sort each column by; a plain number or "1,234" cell sorts by itself. */
  values?: (number | null)[];
};

/** Numbers per row, drawn by the shared DataTable: a table from 1024px, cards on phones.
 *  `columns` are the number columns; the first column is always the row title.
 *  Number columns sort on a header tap. Server pages can pass JSX cells (no functions). */
export function StatTable({
  titleLabel,
  columns,
  rows,
  storageKey,
}: {
  titleLabel: string;
  columns: StatColumn[];
  rows: StatRow[];
  /** Remember hidden columns per page (shows the "คอลัมน์" button) */
  storageKey?: string;
}) {
  const sortOf = (r: StatRow, i: number): number | null => {
    const v = r.values?.[i];
    if (v !== undefined) return v;
    const c = r.cells[i];
    if (typeof c === "number") return c;
    if (typeof c === "string") {
      // First number in the text: "1,234 บาท" · "เลย 3" · "12 (30%)" → 12
      const m = c.match(/-?\d[\d,]*(\.\d+)?/);
      return m ? Number(m[0].replace(/,/g, "")) : null;
    }
    return null;
  };

  const titleCell = (r: StatRow) =>
    r.href ? (
      <Link href={r.href} className="inline-flex min-h-11 items-center font-medium text-brand underline-offset-2 hover:underline">
        {r.title}
      </Link>
    ) : (
      <span className="font-medium">{r.title}</span>
    );

  const cols: DataTableColumn<StatRow>[] = [
    {
      key: "title",
      header: titleLabel,
      render: titleCell,
      sortable: rows.some((r) => r.sortTitle),
      sortValue: (r) => r.sortTitle,
    },
    ...columns.map(
      (c, i): DataTableColumn<StatRow> => ({
        key: `c${i}`,
        header: c.label,
        align: "right",
        sortable: true,
        sortValue: (r) => sortOf(r, i),
        render: (r) => r.cells[i],
      }),
    ),
  ];

  return (
    <DataTable
      columns={cols}
      data={rows}
      rowKey="key"
      storageKey={storageKey}
      mobileCardRender={(r) => {
        const inner = (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{r.title}</span>
              {r.href && <span className="shrink-0 text-sm text-brand">{r.linkLabel ?? "ดู"} ›</span>}
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              {columns.map((c, i) => (
                <div key={c.label} className="flex min-w-0 flex-col">
                  <dt className="text-xs text-ink-soft">{c.label}</dt>
                  <dd className="font-medium break-words">{r.cells[i]}</dd>
                </div>
              ))}
            </dl>
          </>
        );
        return r.href ? (
          <Link href={r.href} className="-m-4 flex min-h-11 flex-col gap-2 p-4">
            {inner}
          </Link>
        ) : (
          <div className="flex flex-col gap-2">{inner}</div>
        );
      }}
    />
  );
}
