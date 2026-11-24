"use client";

/**
 * <MultiSelectSearch> — pick several values from a list with a search box
 * (ported from aoocommerce MultiSelectSearch.tsx). Picked values show as chips on one line
 * ("+N" when they do not fit). Same height and font as FormSelect.
 *
 *  - Controlled (`value` + `onChange(ids)`) or uncontrolled (`defaultValue`).
 *  - `name` sends one form field per picked id (formData.getAll(name)), like checkboxes with the same name.
 *
 * <MultiSelectSearch name="project_ids" defaultValue={ids} options={projects} placeholder="เลือกโครงการ" />
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckIcon, ChevronDownIcon, CloseIcon, SearchIcon } from "@/lib/icons";
import { FloatingPanel } from "./floating-panel";

export interface MultiSelectOption {
  id: string;
  label: string;
  subtitle?: string;
  icon?: ReactNode;
}

export function MultiSelectSearch({
  options,
  value: valueProp,
  defaultValue = [],
  onChange,
  name,
  placeholder = "เลือก",
  searchPlaceholder = "ค้นหา",
  showSelectAll = true,
  disabled,
  maxVisibleChips = 3,
  "aria-label": ariaLabel,
  className = "",
}: {
  options: MultiSelectOption[];
  value?: string[];
  defaultValue?: string[];
  onChange?: (ids: string[]) => void;
  /** Form field name: one hidden field per picked id. */
  name?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  /** "เลือกทั้งหมด" at the top of the list */
  showSelectAll?: boolean;
  disabled?: boolean;
  /** Chips shown before "+N" */
  maxVisibleChips?: number;
  "aria-label"?: string;
  className?: string;
}) {
  const [inner, setInner] = useState<string[]>(defaultValue);
  const value = valueProp ?? inner;
  const set = (ids: string[]) => {
    if (valueProp === undefined) setInner(ids);
    onChange?.(ids);
  };
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const picked = useMemo(() => new Set(value), [value]);
  const pickedOptions = options.filter((o) => picked.has(o.id));
  const q = search.trim().toLowerCase();
  const filtered = q
    ? options.filter((o) => `${o.label} ${o.subtitle ?? ""}`.toLowerCase().includes(q))
    : options;
  const allFilteredPicked = filtered.length > 0 && filtered.every((o) => picked.has(o.id));

  const close = useCallback(() => {
    setOpen(false);
    setSearch("");
  }, []);

  useEffect(() => {
    if (!open) return;
    const f = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(f);
  }, [open]);

  const toggle = (id: string) => set(picked.has(id) ? value.filter((v) => v !== id) : [...value, id]);
  const toggleAll = () => {
    const ids = new Set(filtered.map((o) => o.id));
    set(allFilteredPicked ? value.filter((v) => !ids.has(v)) : Array.from(new Set([...value, ...ids])));
  };

  const chips = pickedOptions.slice(0, maxVisibleChips);
  const more = pickedOptions.length - chips.length;

  return (
    <div className={`relative w-full ${className}`}>
      {name !== undefined && value.map((id) => <input key={id} type="hidden" name={name} value={id} />)}
      <div
        ref={anchorRef}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-disabled={disabled || undefined}
        aria-label={ariaLabel}
        onClick={() => !disabled && (open ? close() : setOpen(true))}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={`flex min-h-11 w-full items-center gap-2 rounded-control border px-3 py-1 text-base transition-colors ${
          disabled
            ? "cursor-not-allowed border-line bg-bg text-ink-soft"
            : open
              ? "border-brand bg-surface ring-2 ring-brand/20"
              : "border-line bg-surface hover:border-line-strong"
        }`}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {pickedOptions.length === 0 ? (
            <span className="text-ink-soft">{placeholder}</span>
          ) : (
            <>
              {chips.map((o) => (
                <span
                  key={o.id}
                  className="inline-flex max-w-full items-center gap-1 rounded-control border border-ok/30 bg-ok-soft py-0.5 pr-0.5 pl-2 text-sm font-medium text-ok"
                >
                  <span className="max-w-40 truncate">{o.label}</span>
                  <button
                    type="button"
                    aria-label={`เอา ${o.label} ออก`}
                    disabled={disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(o.id);
                    }}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-control hover:bg-surface/60"
                  >
                    <CloseIcon className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </span>
              ))}
              {more > 0 && <span className="text-sm whitespace-nowrap text-ink-soft">+{more}</span>}
            </>
          )}
        </div>
        {pickedOptions.length > 0 && !disabled && (
          <button
            type="button"
            aria-label="ล้างที่เลือกทั้งหมด"
            onClick={(e) => {
              e.stopPropagation();
              set([]);
            }}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-ink-soft hover:bg-sidebar-hover hover:text-ink"
          >
            <CloseIcon className="h-4 w-4" aria-hidden />
          </button>
        )}
        <ChevronDownIcon className={`h-4 w-4 shrink-0 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </div>

      <FloatingPanel
        open={open}
        anchorRef={anchorRef}
        onDismiss={close}
        matchWidth="exact"
        mobileSheet
        stopPropagation={false}
        className="flex flex-col overflow-hidden rounded-control border border-line bg-surface shadow-xl"
      >
        <div className="shrink-0 border-b border-line p-2">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-soft" aria-hidden />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="min-h-11 w-full rounded-control border border-line bg-bg pr-3 pl-9 text-base text-ink placeholder:text-ink-soft"
            />
          </div>
          {showSelectAll && filtered.length > 0 && (
            <button
              type="button"
              onClick={toggleAll}
              className="mt-1 min-h-11 w-full rounded-control px-2 text-left text-sm font-medium text-brand hover:bg-brand-soft"
            >
              {allFilteredPicked ? `ไม่เลือกทั้งหมด (${filtered.length})` : `เลือกทั้งหมด (${filtered.length})`}
            </button>
          )}
        </div>
        <div role="listbox" aria-multiselectable className="max-h-72 min-h-0 overflow-y-auto overscroll-contain">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-base text-ink-soft">ไม่พบรายการ</p>
          ) : (
            filtered.map((o) => {
              const on = picked.has(o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => toggle(o.id)}
                  className={`flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-sidebar-hover ${on ? "bg-brand-soft/50" : ""}`}
                >
                  <span
                    aria-hidden
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${on ? "bg-brand text-brand-ink" : "border-2 border-line-strong"}`}
                  >
                    {on && <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                  {o.icon && <span className="shrink-0">{o.icon}</span>}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base text-ink">{o.label}</span>
                    {o.subtitle && <span className="block truncate text-xs text-ink-soft">{o.subtitle}</span>}
                  </span>
                </button>
              );
            })
          )}
        </div>
        {pickedOptions.length > 0 && (
          <div className="flex shrink-0 items-center justify-between border-t border-line bg-bg px-3 py-1 text-sm text-ink-soft">
            <span>เลือกแล้ว {pickedOptions.length} รายการ</span>
            <button type="button" onClick={() => set([])} className="min-h-11 px-2 font-medium text-brand hover:underline">
              ล้าง
            </button>
          </div>
        )}
      </FloatingPanel>
    </div>
  );
}
