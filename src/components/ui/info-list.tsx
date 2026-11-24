import type { ReactNode } from "react";

export type InfoItem = {
  label: string;
  value: ReactNode;
  tone?: "danger";
  hidden?: boolean;
};

/**
 * <InfoList> — label + value pairs, the one way to show record details (customer, plot, project …).
 * Label = .lbl (small grey), value = .val (dark, medium) from globals.css; each pair on one line, centred.
 *  layout="grid": pairs side by side (2 columns from md) · layout="rows": one pair per row, value right-aligned.
 */
export function InfoList({
  items,
  layout = "grid",
}: {
  items: InfoItem[];
  layout?: "grid" | "rows";
}) {
  const shown = items.filter((i) => !i.hidden);
  return (
    <dl
      className={
        layout === "grid"
          ? "grid gap-x-6 gap-y-2 md:grid-cols-2"
          : "flex flex-col"
      }
    >
      {shown.map((i) => (
        <div
          key={i.label}
          className={
            layout === "grid"
              ? "flex min-w-0 items-center gap-2"
              : "flex min-h-11 items-center justify-between gap-4 border-b border-line py-2 last:border-0"
          }
        >
          <dt className="lbl shrink-0">{i.label}</dt>
          <dd
            className={`val min-w-0 break-words ${layout === "rows" ? "text-right" : ""} ${i.tone === "danger" ? "text-danger" : ""}`}
          >
            {i.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
