// Thai address search (ported from aoocommerce lib/thai-address-data.ts + lib/address-suggest-keys.ts).
// The dataset (~480 KB) lives in src/lib/data/thai-address-data.ts and is loaded on demand with
// loadThaiAddress(), so it is never part of a page's main bundle.

export interface ThaiAddress {
  district: string;
  amphoe: string;
  province: string;
  zipcode: number;
}

/** The parts the address fields hold. postalCode is text ("10110"). */
export interface ThaiAddressParts {
  district: string;
  amphoe: string;
  province: string;
  postalCode: string;
}

export type AddressField = "district" | "amphoe" | "province" | "zipcode";

export interface ThaiAddressData {
  PROVINCES: string[];
  DATA: [string, string, number, number][];
}

let dataPromise: Promise<ThaiAddressData> | null = null;

/** Load the dataset once (dynamic import = its own chunk). */
export function loadThaiAddress(): Promise<ThaiAddressData> {
  dataPromise ||= import("./data/thai-address-data").catch((e) => {
    dataPromise = null;
    throw e;
  });
  return dataPromise;
}

export const BANGKOK = "กรุงเทพมหานคร";

/** No real name starts with these, so pasted "แขวงมีนบุรี เขตมีนบุรี กทม." still matches. */
const ADMIN_PREFIX = /^(แขวง|ตำบล|ต\.|เขต|อำเภอ|อ\.|จังหวัด|จ\.)/;
const PROVINCE_ALIAS: Record<string, string> = { กทม: BANGKOK, "กทม.": BANGKOK };

function normalizeToken(token: string): string {
  return PROVINCE_ALIAS[token] ?? token.replace(ADMIN_PREFIX, "");
}

/** Every typed word must match some column. Exact < starts with < contains. */
export function searchAddress(data: ThaiAddressData, query: string, field?: AddressField, limit = 30): ThaiAddress[] {
  const tokens = query.trim().toLowerCase().split(/\s+/).map(normalizeToken).filter(Boolean);
  if (tokens.length === 0) return [];
  const scoreOf = (hay: string, t: string) => (hay === t ? 0 : hay.startsWith(t) ? 1 : hay.includes(t) ? 2 : Infinity);
  const scored: { addr: ThaiAddress; score: number }[] = [];
  const { DATA, PROVINCES } = data;
  for (let i = 0; i < DATA.length; i++) {
    const [d, a, pi, z] = DATA[i];
    const p = PROVINCES[pi];
    const zip = String(z);
    let total = 0;
    let ok = true;
    for (const t of tokens) {
      const best = Math.min(
        !field || field === "district" ? scoreOf(d, t) : Infinity,
        !field || field === "amphoe" ? scoreOf(a, t) : Infinity,
        !field || field === "province" ? scoreOf(p, t) : Infinity,
        !field || field === "zipcode" ? (zip === t ? 0 : zip.startsWith(t) ? 1 : Infinity) : Infinity,
      );
      if (!Number.isFinite(best)) {
        ok = false;
        break;
      }
      total += best;
    }
    if (ok) scored.push({ addr: { district: d, amphoe: a, province: p, zipcode: z }, score: total });
  }
  scored.sort((x, y) => x.score - y.score); // stable: ties keep data order
  return scored.slice(0, limit).map((r) => r.addr);
}

/** The dataset row for these names, or null. */
export function findAddress(data: ThaiAddressData, district: string, amphoe: string, province: string): ThaiAddress | null {
  const pi = data.PROVINCES.indexOf(province);
  if (pi < 0) return null;
  const row = data.DATA.find(([d, a, p]) => p === pi && d === district && a === amphoe);
  return row ? { district: row[0], amphoe: row[1], province, zipcode: row[3] } : null;
}

/**
 * One address line in the usual Thai order, as printed on documents:
 *   "99/1 ถ.สุขุมวิท ต.บางพลีใหญ่ อ.บางพลี จ.สมุทรปราการ 10540"
 *   "12 ซ.ลาดพร้าว 5 แขวงจอมพล เขตจตุจักร กรุงเทพมหานคร 10900"
 * Empty parts are left out.
 */
export function composeThaiAddress(line: string, p: ThaiAddressParts): string {
  const bkk = p.province === BANGKOK;
  return [
    line.trim(),
    p.district && (bkk ? `แขวง${p.district}` : `ต.${p.district}`),
    p.amphoe && (bkk ? `เขต${p.amphoe}` : `อ.${p.amphoe}`),
    p.province && (bkk ? BANGKOK : `จ.${p.province}`),
    p.postalCode.trim(),
  ]
    .filter(Boolean)
    .join(" ");
}

const TAIL =
  /^(.*?)\s*(?:ต\.|ตำบล|แขวง)\s*(\S+)\s+(?:อ\.|อำเภอ|เขต)\s*(\S+)\s+(?:จ\.|จังหวัด)?\s*(\S+?)\s*(\d{5})?\s*$/;

/**
 * Best-effort reverse of composeThaiAddress: split a saved address into the free line and the
 * area parts, only when ตำบล/อำเภอ/จังหวัด are found together in the dataset.
 * Otherwise the whole text goes to the free line and the parts stay empty.
 */
export function parseThaiAddress(
  data: ThaiAddressData,
  text: string,
): { line: string; parts: ThaiAddressParts } {
  const empty = { district: "", amphoe: "", province: "", postalCode: "" };
  const m = text.trim().match(TAIL);
  if (!m) return { line: text, parts: empty };
  const [, line, district, amphoe, provinceRaw, zip] = m;
  const province = PROVINCE_ALIAS[provinceRaw] ?? provinceRaw;
  const hit = findAddress(data, district, amphoe, province);
  if (!hit) return { line: text, parts: empty };
  return {
    line: line.trim(),
    parts: { district: hit.district, amphoe: hit.amphoe, province: hit.province, postalCode: zip ?? String(hit.zipcode) },
  };
}

/** Keyboard for a suggestion list: ↑/↓ move · Enter picks · Tab picks the highlighted (or only) row · Esc closes. */
export function handleSuggestKey<T>(
  e: React.KeyboardEvent,
  o: { items: T[]; index: number; setIndex: (n: number) => void; pick: (item: T) => void; close: () => void },
): void {
  const n = o.items.length;
  if (n === 0) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    o.setIndex(Math.min(o.index + 1, n - 1));
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    o.setIndex(Math.max(o.index - 1, 0));
  } else if (e.key === "Enter") {
    if (o.index < 0) return;
    e.preventDefault();
    o.pick(o.items[Math.min(o.index, n - 1)]);
  } else if (e.key === "Tab" && !e.shiftKey) {
    const i = o.index >= 0 ? Math.min(o.index, n - 1) : n === 1 ? 0 : -1;
    if (i >= 0) o.pick(o.items[i]);
    else o.close();
  } else if (e.key === "Escape") {
    e.preventDefault();
    o.close();
  }
}
