// Shapes shared by the plot page, the project page and the customer page.
// They mirror the database: unit_board() return columns (0004_units.sql, model columns from
// 0010_house_models.sql) and the site_plans table.
import type { UnitStatus } from "@/config/units";
import type { StageTone } from "@/config/stages";
import type { HouseCategory } from "@/config/houses";

/** One row of unit_board(p_project). lead_id / lead_name are null when the caller may not see the customer. */
export type BoardUnit = {
  id: string;
  code: string;
  zone: string;
  house_type: string;
  land_sqw: number | null;
  usable_sqm: number | null;
  price: number | null;
  status: UnitStatus;
  note: string;
  plan_id: string | null;
  pos_x: number | null;
  pos_y: number | null;
  interest_count: number;
  lead_id: string | null;
  lead_name: string | null;
  holder_name: string | null;
  mine: boolean;
  updated_at: string;
  /** House model the plot is built as (null when house_type matches no model). */
  house_model_id: string | null;
  model_name: string | null;
  model_category: HouseCategory | null;
};

/** A site_plans row plus a signed URL of its picture (made on the server, valid 1 hour). */
export type PlanView = {
  id: string;
  name: string;
  image_path: string | null;
  image_w: number | null;
  image_h: number | null;
  sort: number;
  url: string | null;
};

export type ProjectOption = { id: string; name: string; is_open: boolean };

/** Statuses that still count as free (can be reserved). */
export const FREE: UnitStatus[] = ["available", "interested"];
export const isFree = (s: UnitStatus) => FREE.includes(s);

/** One Thai letter per status, printed on every pin so status is never shown by color alone. */
export const STATUS_LETTER: Record<UnitStatus, string> = {
  available: "ว",
  interested: "ส",
  reserved: "จ",
  contracted: "ท",
  transferred: "โ",
};

/** Pin colors per tone (same palette as Badge, solid enough to read on a busy picture). */
export const PIN_TONE: Record<StageTone, string> = {
  neutral: "border-ink-soft bg-surface text-ink",
  warn: "border-warn bg-warn-soft text-warn-ink",
  brand: "border-brand bg-brand text-brand-ink",
  ok: "border-ok bg-ok-soft text-ok",
  danger: "border-danger bg-danger-soft text-danger",
};

/** A pin is placed when it belongs to a plan and has both coordinates. */
export const hasPin = (u: Pick<BoardUnit, "plan_id" | "pos_x" | "pos_y">) =>
  u.plan_id !== null && u.pos_x !== null && u.pos_y !== null;

/** "14:05" in Bangkok time. */
export const hhmm = (d: Date) =>
  d.toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });
