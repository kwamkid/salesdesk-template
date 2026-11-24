// CSV downloads for /reports. Uses the signed-in user's client, so Row Level Security decides
// which rows come back (sales: their own leads only). Roles are checked here as well.
// No file ever contains national_id or address.

import { NextResponse, type NextRequest } from "next/server";
import { isIsoDate, isUuid, META_GROUPS, thaiFileDate } from "@/components/reports/params";
import type { TeamRow } from "@/components/reports/data";
import { activityLabel } from "@/config/activities";
import type { Role } from "@/config/roles";
import { stageOf, STAGES } from "@/config/stages";
import { getMe } from "@/lib/auth";
import { nameForMeta } from "@/lib/meta";
import { csvResponse, toCsv, type CsvColumn } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRpc } from "./fetch-all";

const TZ = "Asia/Bangkok";

/** "2026-11-23 14:05" in Bangkok time (a format Excel reads as a date). */
const bkk = (v: string | null) =>
  v
    ? new Date(v).toLocaleString("sv-SE", {
        timeZone: TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "";

const yesNo = (v: boolean) => (v ? "มาชมแล้ว" : "ยังไม่มาชม");

/** Notes in the team pack: the database masks Thai phone numbers; also hide emails and +66 numbers. */
const maskNote = (s: string | null) =>
  (s ?? "")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[อีเมล]")
    .replace(/\+?66[\s-]?[0-9][0-9\s-]{7,10}[0-9]/g, "[เบอร์โทร]");



type Params = {
  project: string | null;
  owner: string | null;
  stage: string | null;
  from: string | null;
  to: string | null;
  group: string | null;
};

type Kind = {
  roles: Role[];
  file: string;
  /** Rows come from this RPC. */
  rpc: string;
  args: (p: Params) => Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: CsvColumn<any>[];
};

const ALL: Role[] = ["admin", "executive", "sales"];
const BOSS: Role[] = ["admin", "executive"];

type LeadRow = {
  full_name: string; phone: string; email: string | null; project: string; owner: string | null;
  campaign: string | null; stage: string; visited: boolean; visited_at: string | null;
  next_follow_up: string | null; last_note: string | null; created_at: string;
};
type ActivityRow = { customer: string; project: string; type: string; note: string | null; created_at: string; by_name: string | null };
type OverdueRow = {
  owner: string; customer: string; phone: string; project: string; stage: string;
  next_follow_up: string; days_overdue: number; last_note: string | null;
};
type MetaRow = { phone: string | null; email: string | null; full_name: string | null };
type PackRow = {
  customer_code: string; project: string; sales: string | null; type: string; note: string | null;
  created_at: string; stage_now: string; lead_created_at: string;
};

const leadsCols: CsvColumn<LeadRow>[] = [
  { header: "ชื่อลูกค้า", value: (r) => r.full_name },
  { header: "เบอร์โทร", value: (r) => r.phone },
  { header: "อีเมล", value: (r) => r.email },
  { header: "โครงการ", value: (r) => r.project },
  { header: "เซลส์", value: (r) => r.owner ?? "ยังไม่มีเจ้าของ" },
  { header: "แคมเปญ", value: (r) => r.campaign ?? "ไม่ระบุแคมเปญ" },
  { header: "ขั้น", value: (r) => stageOf(r.stage).label },
  { header: "มาชมหรือยัง", value: (r) => yesNo(r.visited) },
  { header: "วันที่มาชม", value: (r) => bkk(r.visited_at) },
  { header: "วันตามครั้งถัดไป", value: (r) => r.next_follow_up },
  { header: "โน้ตล่าสุด", value: (r) => r.last_note },
  { header: "วันที่ได้ลีด", value: (r) => bkk(r.created_at) },
];

const activityCols: CsvColumn<ActivityRow>[] = [
  { header: "ลูกค้า", value: (r) => r.customer },
  { header: "โครงการ", value: (r) => r.project },
  { header: "ประเภท", value: (r) => activityLabel(r.type) },
  { header: "โน้ต", value: (r) => r.note },
  { header: "วันเวลา", value: (r) => bkk(r.created_at) },
  { header: "เซลส์", value: (r) => r.by_name },
];

const overdueCols: CsvColumn<OverdueRow>[] = [
  { header: "เซลส์", value: (r) => r.owner },
  { header: "ลูกค้า", value: (r) => r.customer },
  { header: "เบอร์โทร", value: (r) => r.phone },
  { header: "โครงการ", value: (r) => r.project },
  { header: "ขั้น", value: (r) => stageOf(r.stage).label },
  { header: "วันที่ต้องตาม", value: (r) => r.next_follow_up },
  { header: "เลยกำหนด (วัน)", value: (r) => r.days_overdue },
  { header: "โน้ตล่าสุด", value: (r) => r.last_note },
];

// Meta's own customer-list column names, nothing else. Name and country help Meta find more
// people; Meta hashes them on upload.
const metaCols: CsvColumn<MetaRow>[] = [
  { header: "phone", value: (r) => r.phone },
  { header: "email", value: (r) => r.email },
  { header: "fn", value: (r) => nameForMeta(r.full_name ?? "").fn },
  { header: "ln", value: (r) => nameForMeta(r.full_name ?? "").ln },
  { header: "country", value: () => "TH" },
];

const packCols: CsvColumn<PackRow>[] = [
  { header: "รหัสลูกค้า", value: (r) => r.customer_code },
  { header: "โครงการ", value: (r) => r.project },
  { header: "เซลส์", value: (r) => r.sales },
  { header: "ประเภท", value: (r) => activityLabel(r.type) },
  { header: "โน้ต", value: (r) => maskNote(r.note) },
  { header: "วันเวลา", value: (r) => bkk(r.created_at) },
  { header: "ขั้นตอนนี้", value: (r) => stageOf(r.stage_now).label },
  { header: "วันที่ได้ลีด", value: (r) => bkk(r.lead_created_at) },
];

const rate = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : "");

const teamCols: CsvColumn<TeamRow>[] = [
  { header: "เซลส์", value: (r) => r.owner_name },
  { header: "ลีดที่ถืออยู่", value: (r) => r.leads_open },
  { header: "ลีดใหม่ในช่วง", value: (r) => r.leads_in_range },
  { header: "กิจกรรมในช่วง", value: (r) => r.activities },
  { header: "กิจกรรมต่อสัปดาห์", value: (r) => r.activities_per_week },
  { header: "ชั่วโมงเฉลี่ยถึงติดต่อครั้งแรก", value: (r) => r.avg_hours_to_first_contact },
  { header: "งานเลยกำหนด", value: (r) => r.overdue },
  { header: "นัดชม", value: (r) => r.appointments },
  { header: "มาชม", value: (r) => r.visits },
  { header: "จอง", value: (r) => r.reservations },
  { header: "ไม่ซื้อ", value: (r) => r.lost },
  { header: "อัตราเป็นนัดชม (%)", value: (r) => rate(Number(r.appointments), Number(r.leads_in_range)) },
  { header: "อัตราเป็นจอง (%)", value: (r) => rate(Number(r.reservations), Number(r.leads_in_range)) },
  { header: "เหตุผลเสียลูกค้าบ่อยสุด", value: (r) => r.top_lost_reason },
];

const KINDS: Record<string, Kind> = {
  leads: {
    roles: ALL,
    file: "ลูกค้าทั้งหมด",
    rpc: "export_leads",
    args: (p) => ({ p_project: p.project, p_owner: p.owner, p_stage: p.stage, p_from: p.from, p_to: p.to }),
    columns: leadsCols,
  },
  activities: {
    roles: ALL,
    file: "กิจกรรมทั้งหมด",
    rpc: "export_activities",
    args: (p) => ({ p_project: p.project, p_owner: p.owner, p_from: p.from, p_to: p.to }),
    columns: activityCols,
  },
  overdue: {
    roles: ALL,
    file: "งานตามที่ค้าง",
    rpc: "export_overdue",
    args: (p) => ({ p_project: p.project, p_owner: p.owner }),
    columns: overdueCols,
  },
  meta: {
    roles: BOSS,
    file: "รายชื่อสำหรับMeta",
    rpc: "export_meta_audience",
    args: (p) => ({ p_group: p.group, p_project: p.project }),
    columns: metaCols,
  },
  "team-activities": {
    roles: BOSS,
    file: "ชุดวิเคราะห์ทีม_กิจกรรม",
    rpc: "team_pack_activities",
    args: (p) => ({ p_project: p.project, p_from: p.from, p_to: p.to }),
    columns: packCols,
  },
  "team-summary": {
    roles: BOSS,
    file: "ชุดวิเคราะห์ทีม_สรุปรายเซลส์",
    rpc: "team_summary",
    args: (p) => ({ p_project: p.project, p_from: p.from, p_to: p.to }),
    columns: teamCols,
  },
};

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function GET(req: NextRequest, ctx: { params: Promise<{ kind: string }> }) {
  const { kind: kindKey } = await ctx.params;
  const kind = Object.hasOwn(KINDS, kindKey) ? KINDS[kindKey] : undefined;
  if (!kind) return fail(404, "ไม่มีไฟล์แบบนี้");

  const me = await getMe();
  if (!me) return fail(401, "กรุณาเข้าสู่ระบบก่อน");
  if (me.status !== "active") return fail(403, "บัญชียังไม่ได้รับอนุมัติ");
  if (!kind.roles.includes(me.role)) return fail(403, "ไม่มีสิทธิ์ออกไฟล์นี้");

  const q = req.nextUrl.searchParams;
  const get = (k: string) => q.get(k) || null;
  let from = isIsoDate(get("from")) ? get("from") : null;
  let to = isIsoDate(get("to")) ? get("to") : null;
  if (from && to && from > to) [from, to] = [to, from];
  const stage = get("stage");
  const group = get("group");

  const params: Params = {
    project: isUuid(get("project")) ? get("project") : null,
    // sales only ever export their own work, whatever the query string says
    owner: me.role === "sales" ? me.id : isUuid(get("owner")) ? get("owner") : null,
    stage: stage && STAGES.some((s) => s.key === stage) ? stage : null,
    from,
    to,
    group: group && Object.hasOwn(META_GROUPS, group) ? group : null,
  };
  if (kindKey === "meta" && !params.group) return fail(400, "กรุณาเลือกกลุ่มรายชื่อ");

  const supabase = await createClient();
  const { rows, error } = await fetchAllRpc<Record<string, unknown>>(supabase, kind.rpc, kind.args(params));
  if (error) return fail(500, "ออกไฟล์ไม่สำเร็จ ลองใหม่อีกครั้ง");

  // Meta: drop rows with neither phone nor email.
  const data = kindKey === "meta" ? rows.filter((r) => r.phone || r.email) : rows;
  const date = thaiFileDate();
  const name = kindKey === "meta" ? `${kind.file}_${META_GROUPS[params.group as string]}_${date}.csv` : `${kind.file}_${date}.csv`;
  return csvResponse(name, toCsv(data, kind.columns));
}
