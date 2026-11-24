// CSV files that open in Excel with Thai text readable (UTF-8 with BOM).

export type CsvColumn<T> = { header: string; value: (row: T) => unknown };

const cell = (v: unknown) => {
  if (v === null || v === undefined) return "";
  const s = v instanceof Date ? v.toISOString() : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]) {
  const lines = [columns.map((c) => cell(c.header)).join(",")];
  for (const r of rows) lines.push(columns.map((c) => cell(c.value(r))).join(","));
  return "﻿" + lines.join("\r\n");
}

/** Response that downloads as a file. The file name can be Thai. */
export function csvResponse(filename: string, csv: string) {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="export.csv"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
