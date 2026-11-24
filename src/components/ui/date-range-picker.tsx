"use client";

/**
 * Date picker for the whole app (ported from aoocommerce components/ui/DateRangePicker.tsx).
 * Never use <input type="date"> / "datetime-local": phones show a different picker per brand
 * and the year is not Buddhist.
 *
 *   <DateRangePicker value={{ startDate, endDate }} onChange={setValue} />          range + shortcuts
 *   <DateRangePicker asSingle value={...} onChange={...} minDate={todayISO()} />    one date
 *   <DatePicker value="2026-11-23" onChange={(iso) => ...} />                       controlled single date (ISO string)
 *   <DateField name="next_follow_up" defaultValue={iso} />                          plain <form>: hidden input YYYY-MM-DD
 *   <DateRangeFields defaultFrom={f.from} defaultTo={f.to} />                       plain <form>: hidden `from` / `to`
 *
 * Range = two months side by side from 640px, one month + shortcut chips as a bottom sheet on phones.
 * Months, weekdays and years are Thai with the Buddhist year (date-fns `th` + 543).
 * Colours come from the theme (brand, line, ink …) so dark mode follows by itself.
 * The calendar is portalled (to <body>, above any open Sheet), flips when there is no room,
 * and closes on Esc or a tap outside.
 * Values are always "YYYY-MM-DD" strings in onChange (local calendar day, no time zone shift).
 * The hidden inputs are not checked by the browser's `required`: validate in the submit handler.
 */
import { addMonths, format, isLastDayOfMonth, isSameDay, isValid, parseISO, startOfMonth, subMonths } from "date-fns";
import { th } from "date-fns/locale";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { DayPicker, type DateRange } from "react-day-picker";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "@/lib/icons";
import { DATE_RANGE_PRESETS, type DateRangePresetDef } from "@/lib/date-range-presets";
import { FloatingPanel, floatingContainerFor } from "./floating-panel";

export type DateValueType = {
  startDate: Date | string | null;
  endDate: Date | string | null;
} | null;

/** The value onChange sends: always ISO day strings. */
export type DateRangeValue = { startDate: string | null; endDate: string | null };

export interface DateRangePickerProps {
  value: DateValueType;
  onChange: (value: DateRangeValue) => void;
  /** Fired when the user finishes a choice: a shortcut, "ตกลง", or a day in single mode. */
  onApply?: (value: DateRangeValue) => void;
  asSingle?: boolean;
  useRange?: boolean;
  showShortcuts?: boolean;
  showFooter?: boolean;
  placeholder?: string;
  /** "short" = "23 พ.ย. 69" · "weekday" = "จ. 23 พ.ย. 2569" · default "23 พ.ย. 2569" */
  displayFormat?: "short" | "weekday";
  disabled?: boolean;
  readOnly?: boolean;
  /** Show the × clear button when there is a value (default true). */
  clearable?: boolean;
  /** Preferred side; it flips by itself when there is no room. Phones always get a bottom sheet. */
  popupDirection?: "down" | "up";
  popupAlign?: "left" | "right";
  /** Days before this cannot be picked ("YYYY-MM-DD" or Date). */
  minDate?: Date | string;
  /** Days after this cannot be picked. */
  maxDate?: Date | string;
  /** Days of the week that cannot be picked (0 = Sunday … 6 = Saturday). */
  disabledDaysOfWeek?: number[];
  /** Thai aria-label of the field (default: the placeholder). */
  ariaLabel?: string;
  id?: string;
}

// ---------------------------------------------------------------- helpers

function toDate(v: Date | string | null | undefined): Date | undefined {
  if (!v) return undefined;
  if (v instanceof Date) return isValid(v) ? v : undefined;
  // "YYYY-MM-DD" must be read as a local day: new Date("2026-11-23") would be UTC midnight.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? parseISO(v) : new Date(v);
  return isValid(d) ? d : undefined;
}

const toISO = (d: Date | undefined): string | null => (d ? format(d, "yyyy-MM-dd") : null);

const BE = 543;
const thFmt = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString("th-TH", opts);

function formatDisplay(d: Date | undefined, fmt: DateRangePickerProps["displayFormat"]): string {
  if (!d) return "";
  if (fmt === "weekday") return thFmt(d, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  if (fmt === "short") return thFmt(d, { day: "numeric", month: "short", year: "2-digit" });
  return thFmt(d, { day: "numeric", month: "short", year: "numeric" });
}

/** Thai month name from date-fns `th`: มกราคม / ม.ค. */
const monthName = (index: number, style: "long" | "short") =>
  format(new Date(2000, index, 1), style === "long" ? "LLLL" : "LLL", { locale: th });

/** Column header: อา จ อ พ พฤ ศ ส */
const weekdayLabel = (date: Date) => format(date, "EEEEEE", { locale: th }).replace(/\.$/, "");

type ViewMode = "calendar" | "months" | "years";
const SHORTCUTS: DateRangePresetDef[] = DATE_RANGE_PRESETS;

// ---------------------------------------------------------------- styles (theme tokens only)
// Two layers per day: the <td> carries the range band, the <button> inside is always a circle
// (selected · hover · today), so hover never draws a different shape over a selected day.
const DAY_FILLED =
  "[&>button]:!bg-brand [&>button]:!text-brand-ink [&>button]:font-semibold [&>button:hover]:!bg-brand-hover";
const DAY_MUTED = "[&>button]:!text-line-strong";

const DAY_PICKER_BASE_CLASSES = {
  months: "",
  month: "",
  month_caption: "hidden",
  nav: "hidden",
  month_grid: "w-full border-collapse",
  weekdays: "",
  weekday: "w-11 pb-2 text-center text-xs font-semibold text-ink-soft",
  week: "",
  day: "p-0 text-center",
  day_button:
    "h-11 w-11 rounded-full text-sm text-ink transition-colors hover:bg-brand/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand",
  today: "font-bold [&>button]:ring-1 [&>button]:ring-inset [&>button]:ring-brand",
  outside: DAY_MUTED,
  disabled: `${DAY_MUTED} [&>button]:cursor-not-allowed [&>button:hover]:!bg-transparent`,
};

const DAY_PICKER_SINGLE_CLASSES = { ...DAY_PICKER_BASE_CLASSES, selected: DAY_FILLED };

// Range look comes from our own modifiers (rangeModifiers) so the band can preview the hovered end day.
const RANGE_MODIFIER_CLASSES = {
  rangeMiddle: "bg-brand/15 [&>button:hover]:bg-brand/30",
  // Endpoints get half a band so it starts/ends at the circle centre (literal strings: Tailwind scans them)
  rangeFrom: "bg-[linear-gradient(to_right,transparent_50%,color-mix(in_srgb,var(--brand)_15%,transparent)_50%)]",
  rangeTo: "bg-[linear-gradient(to_left,transparent_50%,color-mix(in_srgb,var(--brand)_15%,transparent)_50%)]",
  bandCapLeft: "rounded-l-full",
  bandCapRight: "rounded-r-full",
  rangeEndpoint: DAY_FILLED,
  rangePreviewEnd: "[&>button]:!bg-brand/30 [&>button]:!text-ink",
  hidden: "invisible",
};

const NAV_BTN = "flex h-11 w-11 items-center justify-center rounded-control text-ink-soft transition-colors hover:bg-bg";
const HEAD_BTN = "min-h-11 rounded-control px-2 text-base font-bold text-ink transition-colors hover:bg-bg";

function CalendarHeader({
  month,
  onPrev,
  onNext,
  onMonthClick,
  onYearClick,
  showPrev = true,
  showNext = true,
}: {
  month: Date;
  onPrev?: () => void;
  onNext?: () => void;
  onMonthClick: () => void;
  onYearClick: () => void;
  showPrev?: boolean;
  showNext?: boolean;
}) {
  return (
    <div className="mb-1 flex items-center justify-between">
      {showPrev ? (
        <button type="button" onClick={onPrev} aria-label="ก่อนหน้า" className={NAV_BTN}>
          <ChevronLeftIcon className="h-5 w-5" aria-hidden />
        </button>
      ) : (
        <div className="w-11" />
      )}
      <div className="flex items-center gap-1">
        <button type="button" onClick={onMonthClick} aria-label="เลือกเดือน" className={HEAD_BTN}>
          {monthName(month.getMonth(), "long")}
        </button>
        <button type="button" onClick={onYearClick} aria-label="เลือกปี" className={HEAD_BTN}>
          {month.getFullYear() + BE}
        </button>
      </div>
      {showNext ? (
        <button type="button" onClick={onNext} aria-label="ถัดไป" className={NAV_BTN}>
          <ChevronRightIcon className="h-5 w-5" aria-hidden />
        </button>
      ) : (
        <div className="w-11" />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- picker

export function DateRangePicker({
  value,
  onChange,
  onApply,
  asSingle = false,
  useRange = true,
  showShortcuts = true,
  showFooter = true,
  placeholder,
  displayFormat,
  disabled = false,
  readOnly = false,
  clearable = true,
  popupDirection,
  popupAlign = "left",
  minDate,
  maxDate,
  disabledDaysOfWeek,
  ariaLabel,
  id,
}: DateRangePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [portalTo, setPortalTo] = useState<HTMLElement | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [displayMonth, setDisplayMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [yearPageStart, setYearPageStart] = useState(() => Math.floor(new Date().getFullYear() / 12) * 12);
  // Which calendar the month/year grid is for (desktop shows two)
  const [pickerSide, setPickerSide] = useState<"left" | "right">("left");

  const isSingle = asSingle || !useRange;
  const min = useMemo(() => toDate(minDate), [minDate]);
  const max = useMemo(() => toDate(maxDate), [maxDate]);

  const disabledDays = useMemo(() => {
    const rules: Array<{ before: Date } | { after: Date } | { dayOfWeek: number[] }> = [];
    if (min) rules.push({ before: min });
    if (max) rules.push({ after: max });
    if (disabledDaysOfWeek?.length) rules.push({ dayOfWeek: disabledDaysOfWeek });
    return rules.length ? rules : undefined;
  }, [min, max, disabledDaysOfWeek]);

  const startDate = useMemo(() => toDate(value?.startDate), [value?.startDate]);
  const endDate = useMemo(() => toDate(value?.endDate), [value?.endDate]);

  // Range picking: 'idle' -> first tap = start -> 'start_picked' -> second tap = end -> 'idle'
  const [selectionPhase, setSelectionPhase] = useState<"idle" | "start_picked">("idle");
  // Day under the mouse while picking the end day: drives the band preview
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const handleDayHover = useCallback(
    (day: Date) => {
      if (selectionPhase === "start_picked") setHoverDate(day);
    },
    [selectionPhase],
  );

  const rangeModifiers = useMemo(() => {
    if (isSingle || !startDate) return undefined;
    const preview =
      selectionPhase === "start_picked" && hoverDate && !isSameDay(hoverDate, startDate) ? hoverDate : null;
    const other = preview ?? endDate;
    if (!other || isSameDay(other, startDate)) return { rangeEndpoint: startDate };
    // A tap before the start swaps the two (handleDayClick): preview the same way
    const [from, to] = other < startDate ? [other, startDate] : [startDate, other];
    return {
      rangeEndpoint: preview ? startDate : [from, to],
      rangePreviewEnd: preview ?? [],
      rangeFrom: from,
      rangeTo: to,
      rangeMiddle: { after: from, before: to },
      bandCapLeft: (d: Date) => d.getDay() === 0 || d.getDate() === 1,
      bandCapRight: (d: Date) => d.getDay() === 6 || isLastDayOfMonth(d),
    };
  }, [isSingle, startDate, endDate, selectionPhase, hoverDate]);

  const rightMonth = useMemo(() => addMonths(displayMonth, 1), [displayMonth]);

  const close = useCallback(() => {
    setOpen(false);
    setViewMode("calendar");
    setHoverDate(null);
  }, []);

  function toggle() {
    if (disabled || readOnly) return;
    if (open) return close();
    // Open on the chosen month, else on the first month that can be picked
    const today = new Date();
    const base = startDate ?? (min && min > today ? min : today);
    setDisplayMonth(startOfMonth(base));
    setSelectionPhase("idle");
    setPortalTo(floatingContainerFor(containerRef.current));
    setOpen(true);
  }

  const handleSingleSelect = (date: Date | undefined) => {
    if (!date) return;
    const iso = toISO(date);
    const v = { startDate: iso, endDate: iso };
    onChange(v);
    onApply?.(v);
    close();
  };

  // Range picking is done here (DayPicker's onSelect is ignored) for full control over start/end.
  const handleDayClick = (day: Date, modifiers: { disabled?: boolean }) => {
    if (modifiers.disabled) return;
    if (selectionPhase === "idle") {
      onChange({ startDate: toISO(day), endDate: null });
      setSelectionPhase("start_picked");
      return;
    }
    const v =
      startDate && day < startDate
        ? { startDate: toISO(day), endDate: toISO(startDate) }
        : { startDate: toISO(startDate ?? day), endDate: toISO(day) };
    onChange(v);
    setSelectionPhase("idle");
    setHoverDate(null);
    if (!showFooter) {
      onApply?.(v);
      close();
    }
  };

  const handleShortcut = (s: DateRangePresetDef) => {
    const { from, to } = s.getValue();
    const v = { startDate: toISO(from), endDate: toISO(to) };
    onChange(v);
    onApply?.(v);
    setSelectionPhase("idle");
    close();
  };

  const handleClear = () => {
    const v = { startDate: null, endDate: null };
    onChange(v);
    onApply?.(v);
    setSelectionPhase("idle");
  };

  const handleMonthClick = (monthIndex: number) => {
    // Right calendar: move so the right one shows the chosen month
    setDisplayMonth(new Date(displayMonth.getFullYear(), pickerSide === "right" ? monthIndex - 1 : monthIndex, 1));
    setViewMode("calendar");
  };

  const handleYearClick = (year: number) => {
    setDisplayMonth(new Date(year, displayMonth.getMonth(), 1));
    setViewMode("months");
  };

  const displayText = useMemo(() => {
    if (!startDate) return "";
    if (isSingle) return formatDisplay(startDate, displayFormat);
    if (!endDate) return `${formatDisplay(startDate, displayFormat)} – `;
    if (isSameDay(startDate, endDate)) return formatDisplay(startDate, displayFormat);
    return `${formatDisplay(startDate, displayFormat)} – ${formatDisplay(endDate, displayFormat)}`;
  }, [startDate, endDate, isSingle, displayFormat]);

  const selected = useMemo<DateRange | undefined>(
    () => (startDate ? { from: startDate, to: endDate } : undefined),
    [startDate, endDate],
  );

  const placeholderText = placeholder || (isSingle ? "เลือกวันที่" : "เลือกช่วงวันที่");
  const showClear = clearable && !!startDate && !disabled && !readOnly;

  const singleNav = {
    onPrev: () => {
      if (viewMode === "calendar") setDisplayMonth(subMonths(displayMonth, 1));
      else if (viewMode === "years") setYearPageStart((p) => p - 12);
    },
    onNext: () => {
      if (viewMode === "calendar") setDisplayMonth(addMonths(displayMonth, 1));
      else if (viewMode === "years") setYearPageStart((p) => p + 12);
    },
    onMonthClick: () => {
      setPickerSide("left");
      setViewMode(viewMode === "months" ? "calendar" : "months");
    },
    onYearClick: () => {
      setPickerSide("left");
      setViewMode(viewMode === "years" ? "calendar" : "years");
      setYearPageStart(Math.floor(displayMonth.getFullYear() / 12) * 12);
    },
  };

  const commonDayPicker = {
    locale: th,
    weekStartsOn: 0 as const,
    formatters: { formatWeekdayName: (date: Date) => weekdayLabel(date) },
    hideNavigation: true,
    disabled: disabledDays,
  };

  const rangeDayPicker = {
    ...commonDayPicker,
    mode: "range" as const,
    selected,
    onSelect: () => {},
    onDayClick: handleDayClick,
    showOutsideDays: false,
    classNames: DAY_PICKER_BASE_CLASSES,
    modifiers: rangeModifiers,
    modifiersClassNames: RANGE_MODIFIER_CLASSES,
    onDayMouseEnter: handleDayHover,
  };

  // Called as a function, not <Component/>: declared in render it would remount every time
  function renderMonthYearSelector() {
    const targetMonth = pickerSide === "right" ? rightMonth : displayMonth;
    const cell = (active: boolean) =>
      `min-h-11 rounded-control py-2 text-base font-bold transition-colors ${
        active ? "bg-brand text-brand-ink" : "text-ink hover:bg-brand/15"
      }`;
    if (viewMode === "months")
      return (
        <div className="grid w-72 grid-cols-3 gap-2 py-2">
          {Array.from({ length: 12 }, (_, i) => (
            <button key={i} type="button" onClick={() => handleMonthClick(i)} className={cell(targetMonth.getMonth() === i)}>
              {monthName(i, "short")}
            </button>
          ))}
        </div>
      );
    return (
      <div className="grid w-72 grid-cols-3 gap-2 py-2">
        {Array.from({ length: 12 }, (_, i) => yearPageStart + i).map((year) => (
          <button key={year} type="button" onClick={() => handleYearClick(year)} className={cell(targetMonth.getFullYear() === year)}>
            {year + BE}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        onClick={toggle}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel ? `${ariaLabel}${displayText ? ` ${displayText}` : ""}` : undefined}
        className={`flex min-h-11 w-full items-center gap-2 rounded-control border bg-surface px-3 text-left text-base transition-colors ${
          open ? "border-brand ring-2 ring-brand/30" : "border-line hover:border-line-strong"
        } ${showClear ? "pr-11" : ""} ${disabled ? "cursor-not-allowed bg-bg opacity-60" : ""}`}
      >
        <CalendarIcon className={`h-5 w-5 shrink-0 ${readOnly ? "text-ink-soft" : "text-brand"}`} aria-hidden />
        {displayText ? (
          <span className={`flex-1 truncate ${readOnly ? "text-ink-soft" : "text-ink"}`}>{displayText}</span>
        ) : (
          <span className="flex-1 truncate text-ink-soft">{placeholderText}</span>
        )}
      </button>
      {showClear && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="ล้างวันที่"
          className="absolute top-0 right-0 flex h-11 w-11 items-center justify-center rounded-control text-ink-soft hover:text-ink"
        >
          <CloseIcon className="h-4 w-4" aria-hidden />
        </button>
      )}

      <FloatingPanel
        open={open}
        anchorRef={containerRef}
        onDismiss={close}
        container={portalTo}
        placement={popupDirection === "up" ? "top" : "bottom"}
        align={popupAlign === "right" ? "end" : "start"}
        mobileSheet
        stopPropagation={false}
        role="dialog"
        ariaLabel={placeholderText}
        className="rounded-card border border-line bg-surface shadow-xl"
      >
        <div className="flex flex-col items-center sm:flex-row sm:items-stretch">
          {/* Shortcuts: chip row above the calendar on phones, side column from 640px */}
          {showShortcuts && !isSingle && (
            <div className="flex gap-2 self-stretch overflow-x-auto border-b border-line px-3 py-2 sm:w-36 sm:flex-col sm:gap-0 sm:overflow-visible sm:border-r sm:border-b-0 sm:px-0">
              {SHORTCUTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => handleShortcut(s)}
                  className="min-h-11 shrink-0 rounded-full border border-line px-3 text-left text-sm whitespace-nowrap text-ink-soft transition-colors hover:bg-brand/15 hover:text-brand sm:rounded-none sm:border-0"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          <div className="p-3" onMouseLeave={() => setHoverDate(null)}>
            {isSingle ? (
              <>
                <CalendarHeader month={displayMonth} {...singleNav} />
                {viewMode === "calendar" ? (
                  <DayPicker
                    {...commonDayPicker}
                    mode="single"
                    selected={startDate}
                    onSelect={handleSingleSelect}
                    month={displayMonth}
                    onMonthChange={setDisplayMonth}
                    classNames={DAY_PICKER_SINGLE_CLASSES}
                  />
                ) : (
                  renderMonthYearSelector()
                )}
              </>
            ) : (
              <>
                {/* Phone: one calendar */}
                <div className="sm:hidden">
                  <CalendarHeader month={displayMonth} {...singleNav} />
                  {viewMode === "calendar" ? (
                    <DayPicker {...rangeDayPicker} month={displayMonth} onMonthChange={setDisplayMonth} />
                  ) : (
                    renderMonthYearSelector()
                  )}
                </div>

                {/* From 640px: two calendars side by side */}
                <div className="hidden sm:block">
                  {viewMode === "calendar" ? (
                    <div className="flex gap-4">
                      <div>
                        <CalendarHeader
                          month={displayMonth}
                          onPrev={() => setDisplayMonth(subMonths(displayMonth, 1))}
                          showNext={false}
                          onMonthClick={() => {
                            setPickerSide("left");
                            setViewMode("months");
                          }}
                          onYearClick={() => {
                            setPickerSide("left");
                            setViewMode("years");
                            setYearPageStart(Math.floor(displayMonth.getFullYear() / 12) * 12);
                          }}
                        />
                        <DayPicker {...rangeDayPicker} month={displayMonth} onMonthChange={setDisplayMonth} />
                      </div>
                      <div className="w-px bg-line" />
                      <div>
                        <CalendarHeader
                          month={rightMonth}
                          onNext={() => setDisplayMonth(addMonths(displayMonth, 1))}
                          showPrev={false}
                          onMonthClick={() => {
                            setPickerSide("right");
                            setViewMode("months");
                          }}
                          onYearClick={() => {
                            setPickerSide("right");
                            setViewMode("years");
                            setYearPageStart(Math.floor(rightMonth.getFullYear() / 12) * 12);
                          }}
                        />
                        <DayPicker
                          {...rangeDayPicker}
                          month={rightMonth}
                          onMonthChange={(m) => setDisplayMonth(subMonths(m, 1))}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      {/* Year pages need prev/next too on the two-month layout */}
                      {viewMode === "years" && (
                        <div className="flex w-72 justify-between">
                          <button type="button" aria-label="ก่อนหน้า" className={NAV_BTN} onClick={() => setYearPageStart((p) => p - 12)}>
                            <ChevronLeftIcon className="h-5 w-5" aria-hidden />
                          </button>
                          <button type="button" aria-label="ถัดไป" className={NAV_BTN} onClick={() => setYearPageStart((p) => p + 12)}>
                            <ChevronRightIcon className="h-5 w-5" aria-hidden />
                          </button>
                        </div>
                      )}
                      {renderMonthYearSelector()}
                    </div>
                  )}
                </div>
              </>
            )}

            {showFooter && !isSingle && (
              <div className="mt-2 flex items-center justify-end gap-2 border-t border-line pt-2">
                <button
                  type="button"
                  onClick={close}
                  className="min-h-11 rounded-control px-4 text-sm text-ink-soft transition-colors hover:bg-bg"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (startDate && endDate) onApply?.({ startDate: toISO(startDate), endDate: toISO(endDate) });
                    close();
                  }}
                  disabled={!startDate || !endDate}
                  className="min-h-11 rounded-control bg-brand px-4 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ตกลง
                </button>
              </div>
            )}
          </div>
        </div>
      </FloatingPanel>
    </div>
  );
}

// ---------------------------------------------------------------- wrappers

/** Controlled single date as an ISO string ("" = none). */
export function DatePicker({
  value,
  onChange,
  ...rest
}: Omit<DateRangePickerProps, "value" | "onChange" | "asSingle" | "onApply"> & {
  value: string;
  onChange: (iso: string) => void;
  onApply?: (iso: string) => void;
}) {
  const { onApply, ...props } = rest;
  return (
    <DateRangePicker
      {...props}
      asSingle
      value={{ startDate: value || null, endDate: value || null }}
      onChange={(v) => onChange(v.startDate ?? "")}
      onApply={onApply ? (v) => onApply(v.startDate ?? "") : undefined}
    />
  );
}

/** Puts the state back to the default when the surrounding <form> is reset. */
function useFormReset(ref: React.RefObject<HTMLInputElement | null>, onReset: () => void) {
  const cb = useRef(onReset);
  useEffect(() => {
    cb.current = onReset;
  });
  useEffect(() => {
    const form = ref.current?.form;
    if (!form) return;
    const handler = () => cb.current();
    form.addEventListener("reset", handler);
    return () => form.removeEventListener("reset", handler);
  }, [ref]);
}

/** Single date for a plain <form> (server action / GET): writes a hidden input `name` = "YYYY-MM-DD". */
export function DateField({
  name,
  defaultValue = "",
  onValueChange,
  ...rest
}: Omit<DateRangePickerProps, "value" | "onChange" | "asSingle" | "onApply"> & {
  name: string;
  defaultValue?: string | null;
  onValueChange?: (iso: string) => void;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const input = useRef<HTMLInputElement>(null);
  useFormReset(input, () => setValue(defaultValue ?? ""));
  return (
    <>
      <DatePicker
        {...rest}
        value={value}
        onChange={(iso) => {
          setValue(iso);
          onValueChange?.(iso);
        }}
      />
      <input ref={input} type="hidden" name={name} value={value} />
    </>
  );
}

/** Date range for a plain <form>: writes hidden inputs `from` / `to` (names can be changed).
 *  `submitOnApply` submits the form at once when a shortcut or "ตกลง" is pressed. */
export function DateRangeFields({
  fromName = "from",
  toName = "to",
  defaultFrom,
  defaultTo,
  submitOnApply = false,
  ...rest
}: Omit<DateRangePickerProps, "value" | "onChange" | "asSingle" | "onApply"> & {
  fromName?: string;
  toName?: string;
  defaultFrom?: string | null;
  defaultTo?: string | null;
  submitOnApply?: boolean;
}) {
  const initial = { startDate: defaultFrom || null, endDate: defaultTo || defaultFrom || null };
  const [value, setValue] = useState<DateRangeValue>(initial);
  const input = useRef<HTMLInputElement>(null);
  useFormReset(input, () => setValue(initial));
  return (
    <>
      <DateRangePicker
        {...rest}
        value={value}
        onChange={setValue}
        onApply={
          submitOnApply
            ? (v) => {
                // Write the hidden inputs before the form reads them
                flushSync(() => setValue(v));
                input.current?.form?.requestSubmit();
              }
            : undefined
        }
      />
      <input ref={input} type="hidden" name={fromName} value={value.startDate ?? ""} />
      {/* A half-picked range (start only) is sent as one day */}
      <input type="hidden" name={toName} value={value.endDate ?? value.startDate ?? ""} />
    </>
  );
}
