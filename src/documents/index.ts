// Registry of the company documents. To add a document: create src/documents/<key>.tsx
// exporting a DocTemplate, then add it to DOCUMENTS below. Settings > documents per stage
// picks it up automatically.

import { quotation } from "./quotation";
import { reservation } from "./reservation";
import type { DocBag, DocTemplate } from "./types";

export const DOCUMENTS: DocTemplate[] = [quotation, reservation];

export const getDocument = (key: string) => DOCUMENTS.find((d) => d.key === key) ?? null;

/** Values for the template: each field's source looked up in the bag ("lead.full_name"). */
export function fillValues(doc: DocTemplate, bag: DocBag): Record<string, string> {
  const v: Record<string, string> = {};
  for (const f of doc.fields) {
    let cur: unknown = f.source ? bag : undefined;
    for (const part of f.source ? f.source.split(".") : []) cur = (cur as Record<string, unknown> | undefined)?.[part];
    v[f.key] = cur === null || cur === undefined ? "" : String(cur);
  }
  return v;
}

/** "23 พฤศจิกายน 2569" — long Thai date with the Buddhist year, Bangkok time. */
export const thLongDate = (d: Date = new Date()) =>
  d.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "long", year: "numeric" });

/** "2,590,000" — amounts and areas on documents, without a unit (the template writes it). */
export const docNumber = (n: number | string | null | undefined) =>
  n === null || n === undefined || n === "" ? "" : Number(n).toLocaleString("th-TH", { maximumFractionDigits: 2 });
