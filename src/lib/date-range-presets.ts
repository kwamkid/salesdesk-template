// Date range shortcuts: the single registry for the whole app (ported from aoocommerce lib/date-range-presets.ts).
//
// Used by the shortcut column of <DateRangePicker>. Never work out "เดือนนี้" or "7 วันล่าสุด" inside a page:
// add the range here so every screen means the same thing.
// Weeks start on Monday, as people in Thailand count them (date-fns defaults to Sunday).
// "Last n days" ends today and includes today, the same as lastDays(n) in src/components/reports/params.ts.

import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subYears,
} from "date-fns";

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_7_days"
  | "last_30_days"
  | "last_90_days"
  | "this_month"
  | "last_month"
  | "this_year"
  | "last_year";

export interface DateRangePresetDef {
  key: DateRangePreset;
  label: string;
  getValue: () => { from: Date; to: Date };
}

const WEEK_OPTS = { weekStartsOn: 1 as const };
const today = () => startOfDay(new Date());

/** In the order shown in the shortcut column: narrow to wide. */
export const DATE_RANGE_PRESETS: DateRangePresetDef[] = [
  { key: "today", label: "วันนี้", getValue: () => ({ from: today(), to: today() }) },
  {
    key: "yesterday",
    label: "เมื่อวาน",
    getValue: () => {
      const y = subDays(today(), 1);
      return { from: y, to: y };
    },
  },
  {
    key: "this_week",
    label: "สัปดาห์นี้",
    getValue: () => ({ from: startOfWeek(today(), WEEK_OPTS), to: startOfDay(endOfWeek(today(), WEEK_OPTS)) }),
  },
  { key: "last_7_days", label: "7 วันล่าสุด", getValue: () => ({ from: subDays(today(), 6), to: today() }) },
  { key: "last_30_days", label: "30 วันล่าสุด", getValue: () => ({ from: subDays(today(), 29), to: today() }) },
  { key: "last_90_days", label: "90 วันล่าสุด", getValue: () => ({ from: subDays(today(), 89), to: today() }) },
  {
    key: "this_month",
    label: "เดือนนี้",
    getValue: () => ({ from: startOfMonth(today()), to: startOfDay(endOfMonth(today())) }),
  },
  {
    key: "last_month",
    label: "เดือนที่แล้ว",
    getValue: () => {
      const pm = subMonths(today(), 1);
      return { from: startOfMonth(pm), to: startOfDay(endOfMonth(pm)) };
    },
  },
  {
    key: "this_year",
    label: "ปีนี้",
    getValue: () => ({ from: startOfYear(today()), to: startOfDay(endOfYear(today())) }),
  },
  {
    key: "last_year",
    label: "ปีที่แล้ว",
    getValue: () => {
      const py = subYears(today(), 1);
      return { from: startOfYear(py), to: startOfDay(endOfYear(py)) };
    },
  },
];

/** Shortcuts shown beside the calendar: 7 so the list is as tall as the two months + OK button.
 *  The rest of the registry still works with getDateRangePreset(). */
export const PICKER_PRESET_KEYS: DateRangePreset[] = ["today", "last_7_days", "last_30_days", "last_90_days", "this_month", "last_month", "this_year"];
export const PICKER_PRESETS: DateRangePresetDef[] = DATE_RANGE_PRESETS.filter((p) => PICKER_PRESET_KEYS.includes(p.key));

export function getDateRangePreset(key: DateRangePreset): { from: Date; to: Date } {
  const preset = DATE_RANGE_PRESETS.find((p) => p.key === key);
  if (!preset) throw new Error(`Unknown date range preset "${key}"`);
  return preset.getValue();
}
