"use client";

/**
 * <ThaiAddressInput> — ตำบล/แขวง · อำเภอ/เขต · จังหวัด · รหัสไปรษณีย์ with suggestions
 * (ported from aoocommerce components/ui/ThaiAddressInput.tsx, Thai only).
 *
 *  - Four fields (default): type in any of them, pick a row, all four are filled.
 *    Every field stays editable for addresses the dataset does not know.
 *  - `compact`: one box; type any part ("บางพลี 10540") and pick.
 *  - The dataset (~480 KB) loads on first focus (src/lib/thai-address.ts), not with the page.
 *  - The list is drawn through FloatingPanel: above open modals, flips, stays on screen.
 *
 * Compose the parts into one text with composeThaiAddress() from src/lib/thai-address.ts.
 *
 * <ThaiAddressInput value={parts} onChange={(p) => setParts({ ...parts, ...p })} />
 */
import { useCallback, useId, useRef, useState } from "react";
import { LocationIcon } from "@/lib/icons";
import {
  handleSuggestKey,
  loadThaiAddress,
  searchAddress,
  type AddressField,
  type ThaiAddress,
  type ThaiAddressData,
  type ThaiAddressParts,
} from "@/lib/thai-address";
import { FloatingPanel } from "./floating-panel";

const LIMIT = 30;

const CONTROL =
  "min-h-11 w-full rounded-control border border-line bg-surface px-3 text-base text-ink placeholder:text-ink-soft disabled:bg-bg";

const FIELDS: { field: AddressField; key: keyof ThaiAddressParts; label: string; placeholder: string; inputMode?: "numeric" }[] = [
  { field: "district", key: "district", label: "ตำบล / แขวง", placeholder: "พิมพ์ชื่อตำบล" },
  { field: "amphoe", key: "amphoe", label: "อำเภอ / เขต", placeholder: "พิมพ์ชื่ออำเภอ" },
  { field: "province", key: "province", label: "จังหวัด", placeholder: "พิมพ์ชื่อจังหวัด" },
  { field: "zipcode", key: "postalCode", label: "รหัสไปรษณีย์", placeholder: "5 หลัก", inputMode: "numeric" },
];

const toParts = (a: ThaiAddress): ThaiAddressParts => ({
  district: a.district,
  amphoe: a.amphoe,
  province: a.province,
  postalCode: String(a.zipcode),
});

export function ThaiAddressInput({
  value,
  onChange,
  disabled,
  compact = false,
  label = "ค้นหาพื้นที่",
  className = "",
}: {
  value: ThaiAddressParts;
  /** Gets the changed parts only (a pick sends all four). */
  onChange: (parts: Partial<ThaiAddressParts>) => void;
  disabled?: boolean;
  /** One search box instead of four fields */
  compact?: boolean;
  /** compact: label of the box */
  label?: string;
  className?: string;
}) {
  const listId = useId();
  const [data, setData] = useState<ThaiAddressData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [active, setActive] = useState<AddressField | "all" | null>(null);
  const [items, setItems] = useState<ThaiAddress[]>([]);
  const [highlight, setHighlight] = useState(-1);
  const [query, setQuery] = useState<string | null>(null);
  const anchors = useRef<Partial<Record<AddressField | "all", HTMLDivElement | null>>>({});
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const pending = useRef<{ q: string; field?: AddressField } | null>(null);

  const run = useCallback((d: ThaiAddressData, q: string, field?: AddressField) => {
    setItems(q.trim() ? searchAddress(d, q, field, LIMIT) : []);
    setHighlight(-1);
  }, []);

  const ensureData = () => {
    if (data || loadError) return;
    loadThaiAddress()
      .then((d) => {
        setData(d);
        const p = pending.current;
        if (p) run(d, p.q, p.field);
      })
      .catch(() => setLoadError(true));
  };

  const close = useCallback(() => {
    setActive(null);
    setItems([]);
    setHighlight(-1);
  }, []);

  const pick = (a: ThaiAddress) => {
    onChange(toParts(a));
    setQuery(null);
    close();
  };

  const search = (q: string, where: AddressField | "all") => {
    anchorRef.current = anchors.current[where] ?? null;
    setActive(where);
    const field = where === "all" ? undefined : where;
    pending.current = { q, field };
    if (data) run(data, q, field);
    else ensureData();
  };

  const open = active !== null && (items.length > 0 || (!data && !loadError));

  const list = (
    <FloatingPanel
      open={open}
      anchorRef={anchorRef}
      onDismiss={close}
      matchWidth="min"
      stopPropagation={false}
      className="flex max-w-[min(448px,calc(100vw-1rem))] flex-col overflow-hidden rounded-control border border-line bg-surface shadow-lg"
    >
      {!data ? (
        <p className="px-4 py-3 text-sm text-ink-soft" role="status">
          กำลังโหลดรายชื่อพื้นที่
        </p>
      ) : (
        <div id={listId} role="listbox" aria-label="พื้นที่ที่ตรงกัน" className="max-h-72 overflow-y-auto overscroll-contain py-1">
          {items.map((a, i) => (
            <button
              key={`${a.district}-${a.amphoe}-${a.province}-${a.zipcode}`}
              type="button"
              role="option"
              aria-selected={i === highlight}
              // Keep focus in the field: pick on mousedown would blur first on some phones.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(a)}
              className={`flex min-h-11 w-full items-center gap-2 px-4 py-2 text-left text-base hover:bg-sidebar-hover ${i === highlight ? "bg-sidebar-hover" : ""}`}
            >
              <LocationIcon className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
              <span className="min-w-0 flex-1">
                {a.district} <span className="text-ink-soft">›</span> {a.amphoe} <span className="text-ink-soft">›</span> {a.province}
              </span>
              <span className="shrink-0 text-sm text-ink-soft tabular-nums">{a.zipcode}</span>
            </button>
          ))}
        </div>
      )}
    </FloatingPanel>
  );

  const keys = (e: React.KeyboardEvent) =>
    handleSuggestKey(e, { items, index: highlight, setIndex: setHighlight, pick, close });

  if (compact) {
    const shown =
      query ??
      [value.district, value.amphoe, value.province, value.postalCode].filter(Boolean).join(" · ");
    return (
      <div
        className={`flex flex-col gap-1 ${className}`}
        ref={(el) => {
          anchors.current.all = el;
        }}
      >
        <span className="text-sm font-medium">{label}</span>
        <input
          type="text"
          value={shown}
          disabled={disabled}
          placeholder="พิมพ์ตำบล อำเภอ จังหวัด หรือรหัสไปรษณีย์"
          aria-label={label}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={open ? listId : undefined}
          aria-expanded={open}
          onFocus={ensureData}
          onChange={(e) => {
            setQuery(e.target.value);
            search(e.target.value, "all");
          }}
          onBlur={() => setQuery(null)}
          onKeyDown={keys}
          autoComplete="off"
          className={CONTROL}
        />
        {loadError && <p className="text-sm text-danger">โหลดรายชื่อพื้นที่ไม่สำเร็จ พิมพ์เองได้</p>}
        {list}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div
            key={f.field}
            ref={(el) => {
              anchors.current[f.field] = el;
            }}
          >
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">{f.label}</span>
              <input
                type="text"
                value={value[f.key]}
                disabled={disabled}
                placeholder={f.placeholder}
                inputMode={f.inputMode}
                maxLength={f.field === "zipcode" ? 5 : 100}
                role="combobox"
          aria-autocomplete="list"
                aria-controls={open && active === f.field ? listId : undefined}
                aria-expanded={open && active === f.field}
                onFocus={ensureData}
                onChange={(e) => {
                  onChange({ [f.key]: e.target.value });
                  search(e.target.value, f.field);
                }}
                onKeyDown={keys}
                autoComplete="off"
                className={CONTROL}
              />
            </label>
          </div>
        ))}
      </div>
      {loadError && <p className="text-sm text-danger">โหลดรายชื่อพื้นที่ไม่สำเร็จ พิมพ์เองได้</p>}
      {list}
    </div>
  );
}
