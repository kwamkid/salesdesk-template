"use client";

/**
 * <TimePicker> — pick a time "HH:mm" from hour and minute columns (aoocommerce TimePicker.tsx).
 *  - `name` adds a form field; `required` is checked by the browser.
 *  - `minuteStep` (default 15) for appointment times; `minHour` / `maxHour` to limit the day.
 *  - Drawn through FloatingPanel (above open modals; bottom sheet on phones).
 */
import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, ClockIcon } from "@/lib/icons";
import { FloatingPanel } from "./floating-panel";

const pad = (n: number) => n.toString().padStart(2, "0");

export function TimePicker({
  value: valueProp,
  defaultValue = "",
  onChange,
  name,
  required,
  disabled,
  placeholder = "เลือกเวลา",
  minuteStep = 15,
  minHour = 0,
  maxHour = 23,
  "aria-label": ariaLabel,
}: {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  minuteStep?: number;
  minHour?: number;
  maxHour?: number;
  "aria-label"?: string;
}) {
  const [inner, setInner] = useState(defaultValue);
  const value = valueProp ?? inner;
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  const [hStr, mStr] = value ? value.split(":") : [];
  const hour = hStr !== undefined ? Number(hStr) : -1;
  const minute = mStr !== undefined ? Number(mStr) : -1;
  const hours = Array.from({ length: maxHour - minHour + 1 }, (_, i) => minHour + i);
  const minutes = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => i * minuteStep);

  const set = (h: number, m: number) => {
    const v = `${pad(h)}:${pad(m)}`;
    if (valueProp === undefined) setInner(v);
    onChange?.(v);
  };

  useEffect(() => {
    if (!open) return;
    const f = requestAnimationFrame(() => {
      hourRef.current?.querySelector<HTMLElement>("[aria-selected=true]")?.scrollIntoView({ block: "center" });
      minuteRef.current?.querySelector<HTMLElement>("[aria-selected=true]")?.scrollIntoView({ block: "center" });
    });
    return () => cancelAnimationFrame(f);
  }, [open]);

  const cellClass = (on: boolean) =>
    `min-h-11 w-full text-center text-base transition-colors ${on ? "bg-brand font-semibold text-brand-ink" : "text-ink hover:bg-sidebar-hover"}`;

  return (
    <div ref={anchorRef} className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel ?? (value ? `เวลา ${value} น.` : placeholder)}
        onClick={() => setOpen((o) => !o)}
        className={`flex min-h-11 w-full items-center gap-2 rounded-control border bg-surface px-3 text-left text-base transition-colors disabled:cursor-not-allowed disabled:bg-bg ${
          open ? "border-brand ring-2 ring-brand/20" : "border-line hover:border-line-strong"
        }`}
      >
        <ClockIcon className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
        <span className={`flex-1 truncate ${value ? "text-ink" : "text-ink-soft"}`}>{value ? `${value} น.` : placeholder}</span>
        <ChevronDownIcon className={`h-4 w-4 shrink-0 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {name !== undefined && (
        <input
          name={name}
          value={value}
          required={required}
          disabled={disabled}
          onChange={() => {}}
          onInvalid={() => triggerRef.current?.focus()}
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-4 h-px w-px opacity-0"
        />
      )}
      <FloatingPanel
        open={open}
        anchorRef={anchorRef}
        onDismiss={() => setOpen(false)}
        matchWidth="min"
        mobileSheet
        stopPropagation={false}
        ariaLabel="เลือกเวลา"
        role="dialog"
        className="rounded-control border border-line bg-surface shadow-lg"
      >
        <div className="flex divide-x divide-line">
          <div className="flex flex-1 flex-col">
            <p className="border-b border-line py-1.5 text-center text-xs text-ink-soft">ชั่วโมง</p>
            <div ref={hourRef} role="listbox" aria-label="ชั่วโมง" className="h-56 overflow-y-auto overscroll-contain">
              {hours.map((h) => (
                <button key={h} type="button" role="option" aria-selected={h === hour} onClick={() => set(h, minute >= 0 ? minute : 0)} className={cellClass(h === hour)}>
                  {pad(h)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-1 flex-col">
            <p className="border-b border-line py-1.5 text-center text-xs text-ink-soft">นาที</p>
            <div ref={minuteRef} role="listbox" aria-label="นาที" className="h-56 overflow-y-auto overscroll-contain">
              {minutes.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="option"
                  aria-selected={m === minute}
                  onClick={() => {
                    set(hour >= 0 ? hour : minHour, m);
                    setOpen(false);
                  }}
                  className={cellClass(m === minute)}
                >
                  {pad(m)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </FloatingPanel>
    </div>
  );
}
