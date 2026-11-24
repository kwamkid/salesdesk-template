import type { JSX } from "react";

/** One blank on the document. `source` is a path into the data bag, e.g. "lead.full_name".
 *  Fields without a source (reservation money ...) are filled by the sales person before printing. */
export type DocField = {
  key: string;
  label: string;
  source?: string;
  required?: boolean;
};

/** A company document. The wording inside Body is fixed text; only v.<key> is filled in. */
export type DocTemplate = {
  key: string; // stored in stage_documents.doc_key and issued_documents.doc_key; do not rename
  title: string;
  prefix: string; // document number prefix, e.g. "RS" -> RS-2569-0001
  paper: "A4";
  fields: DocField[];
  Body: (props: { v: Record<string, string> }) => JSX.Element;
};

/** Values the page collects for a lead, grouped by where they come from. */
export type DocBag = {
  company: { name: string; address: string; phone: string; tax_id: string };
  lead: { full_name: string; phone: string; email: string; address: string; national_id: string };
  project: { name: string; location: string };
  unit: { code: string; zone: string; house_type: string; land_sqw: string; usable_sqm: string; price: string };
  sales: { name: string };
  today: string;
};
