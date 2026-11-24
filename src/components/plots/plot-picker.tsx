"use client";

import { useId, useState } from "react";
import { unitStatusOf, type UnitStatus } from "@/config/units";

export type PickerUnit = { id: string; code: string; zone: string; status: UnitStatus };

const MAX_SHOWN = 30;

/** Type-to-search dropdown to pick a plot by its code. Always available next to the site plan,
 *  so a plot can be chosen even when there is no picture, it fails to load, or it has no pins.
 *  Keyboard: arrow keys move, Enter picks, Escape closes. */
export function PlotPicker<T extends PickerUnit>({
  units,
  onPick,
  label = "ค้นหาเลขแปลง",
  placeholder = "พิมพ์เลขแปลง เช่น A07",
  describe,
}: {
  units: T[];
  onPick: (unit: T) => void;
  label?: string;
  placeholder?: string;
  /** Extra text after the status in each option, e.g. "สนใจแล้ว". */
  describe?: (unit: T) => string;
}) {
  const id = useId();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const needle = q.trim().toUpperCase();
  const matches = (needle ? units.filter((u) => u.code.toUpperCase().includes(needle)) : units)
    .slice()
    .sort((a, b) => {
      // exact match first, then codes that start with the text
      const score = (u: T) => (u.code.toUpperCase() === needle ? 0 : u.code.toUpperCase().startsWith(needle) ? 1 : 2);
      return score(a) - score(b) || a.code.localeCompare(b.code, "th", { numeric: true });
    });
  const shown = matches.slice(0, MAX_SHOWN);

  const pick = (u: T) => {
    onPick(u);
    setQ("");
    setOpen(false);
    setActive(0);
  };

  return (
    <div className="relative">
      <label htmlFor={`${id}-input`} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={`${id}-input`}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={open && shown[active] ? `${id}-opt-${shown[active].id}` : undefined}
        autoComplete="off"
        inputMode="text"
        enterKeyHint="search"
        className="min-h-11 w-full rounded-control border border-line bg-surface px-3 text-base text-ink placeholder:text-ink-soft"
        placeholder={placeholder}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, shown.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (open && shown[active]) pick(shown[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && (
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-label="แปลงที่ตรงกับคำค้น"
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-control border border-line bg-surface shadow-lg"
        >
          {shown.length === 0 && <li className="px-3 py-3 text-sm text-ink-soft">ไม่พบแปลง {q}</li>}
          {shown.map((u, i) => (
            <li
              key={u.id}
              id={`${id}-opt-${u.id}`}
              role="option"
              aria-selected={i === active}
              // mousedown instead of click so the input's blur does not close the list first
              onMouseDown={(e) => {
                e.preventDefault();
                pick(u);
              }}
              className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 ${
                i === active ? "bg-brand-soft" : ""
              }`}
            >
              <span className="font-medium">
                {u.code}
                {u.zone && <span className="ml-2 text-sm font-normal text-ink-soft">โซน {u.zone}</span>}
              </span>
              <span className="text-sm text-ink-soft">
                {unitStatusOf(u.status).label}
                {describe?.(u) ? ` · ${describe(u)}` : ""}
              </span>
            </li>
          ))}
          {matches.length > MAX_SHOWN && (
            <li className="px-3 py-2 text-xs text-ink-soft">
              แสดง {MAX_SHOWN} จาก {matches.length} แปลง พิมพ์เลขให้ละเอียดขึ้น
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
