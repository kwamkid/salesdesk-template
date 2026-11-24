import Link from "next/link";
import { AvatarName } from "@/components/ui/avatar";
import { ActionIcon, buttonClass } from "@/components/ui/button";
import { Badge, Card, Notice, StageBadge } from "@/components/ui/card";
import type { StageKey } from "@/config/stages";
import { activityLabel } from "@/config/activities";
import {
  addDaysISO,
  telHref,
  thDateTime,
  thDay,
  thTime,
  todayISO,
} from "@/lib/format";
import { VisitCheckIn } from "./visit-check-in";

/** One row of upcoming_visits() (migration 0019). */
export type VisitRow = {
  visit_day: string;
  lead_id: string;
  full_name: string;
  phone: string;
  project_name: string;
  stage: StageKey;
  appointment_at: string;
  arrived_at: string | null;
  next_follow_up: string | null;
  owner_id: string | null;
  owner_name: string | null;
};

type Owner = { name: string; url: string };

/** One past contact (activities row), newest first. */
export type VisitActivity = { type: string; note: string; created_at: string };
/** What the customer already talked about: recent contacts and the plots they like. */
export type VisitContext = { history: VisitActivity[]; interests: string[] };

/** Before the visit: what they like and what was said, so the sales can call or greet them prepared.
 *  The newest contact is shown in full; older ones fold under "ดูประวัติเพิ่ม". */
function VisitHistory({ leadId, ctx }: { leadId: string; ctx?: VisitContext }) {
  if (!ctx || (ctx.history.length === 0 && ctx.interests.length === 0))
    return <p className="lbl">ยังไม่มีประวัติการติดต่อ</p>;
  const [latest, ...older] = ctx.history;
  const line = (a: VisitActivity) => (
    <>
      <span className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral">{activityLabel(a.type)}</Badge>
        <span className="lbl">{thDateTime(a.created_at)}</span>
      </span>
      <span className="break-words">{a.note || "-"}</span>
    </>
  );
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-control border border-line bg-bg p-2">
      {ctx.interests.length > 0 && (
        <p className="flex flex-wrap items-center gap-1">
          <span className="lbl">สนใจ</span>
          {ctx.interests.map((t) => (
            <Badge key={t} tone="brand">
              {t}
            </Badge>
          ))}
        </p>
      )}
      {latest && <p className="flex min-w-0 flex-col gap-1">{line(latest)}</p>}
      {older.length > 0 && (
        <details className="group">
          <summary className="link min-h-11 cursor-pointer py-2 text-sm">
            ดูประวัติเพิ่ม ({older.length})
          </summary>
          <ul className="flex flex-col gap-2 border-t border-line pt-2">
            {older.map((a, i) => (
              <li key={i} className="flex min-w-0 flex-col gap-1">
                {line(a)}
              </li>
            ))}
          </ul>
          <Link
            href={`/leads/${leadId}`}
            className="link mt-1 inline-flex min-h-11 items-center text-sm"
          >
            เปิดหน้าลูกค้า
          </Link>
        </details>
      )}
    </div>
  );
}

/** One colour per day so the three columns read apart at a glance: today = brand (act now),
 *  tomorrow = info blue (confirm by phone), day after = calm grey. Theme classes only. */
const DAY_STYLE = [
  {
    border: "border-line border-t-brand",
    head: "bg-brand-soft text-brand",
    pill: "bg-brand text-brand-ink",
  },
  {
    border: "border-line border-t-info",
    head: "bg-info-soft text-info",
    pill: "bg-info text-surface",
  },
  {
    border: "border-line border-t-line-strong",
    head: "bg-bg text-ink-soft",
    pill: "bg-line text-ink",
  },
];

/** "อีก 45 นาที" / "2 ชม." */
const span = (min: number) =>
  min < 60 ? `${min} นาที` : `${Math.floor(min / 60)} ชม.`;

/** Today only: arrived, late, coming soon (call to confirm), or later today. */
function VisitStatus({ r, now }: { r: VisitRow; now: number }) {
  if (r.arrived_at)
    return <Badge tone="ok">มาแล้ว {thTime(r.arrived_at)}</Badge>;
  const min = Math.round((new Date(r.appointment_at).getTime() - now) / 60000);
  if (min < 0)
    return <Badge tone="danger">เลยเวลา {span(-min)} · ยังไม่มา</Badge>;
  if (min <= 120) return <Badge tone="warn">อีก {span(min)} · โทรยืนยันก่อน</Badge>;
  return <Badge tone="neutral">ยังไม่ถึงเวลา</Badge>;
}

function VisitItem({
  r,
  isToday,
  now,
  owner,
  ctx,
  canLog,
}: {
  r: VisitRow;
  isToday: boolean;
  now: number;
  owner?: Owner;
  ctx?: VisitContext;
  canLog: boolean;
}) {
  const checkIn = isToday && canLog && !r.arrived_at;
  return (
    <li className="@container min-w-0 rounded-control border border-line p-3">
      <div className="flex min-w-0 flex-col gap-3 @xl:flex-row @xl:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="w-14 shrink-0 text-xl font-bold tabular-nums">
            {thTime(r.appointment_at)}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Link
                href={`/leads/${r.lead_id}`}
                className="link min-w-0 font-semibold break-words"
              >
                {r.full_name}
              </Link>
              <StageBadge stage={r.stage} />
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="min-w-0 truncate">{r.project_name}</span>
              {isToday && <VisitStatus r={r} now={now} />}
            </div>
            {owner && (
              <span className="lbl">
                <AvatarName name={owner.name} url={owner.url} />
              </span>
            )}
            <VisitHistory leadId={r.lead_id} ctx={ctx} />
          </div>
        </div>
        {!r.arrived_at && (
          <div
            className={`grid shrink-0 gap-2 ${checkIn ? "grid-cols-2" : "grid-cols-1"} @xl:flex @xl:items-center`}
          >
            <a
              href={telHref(r.phone)}
              className={buttonClass("secondary")}
              aria-label={`โทรยืนยันนัดกับ ${r.full_name}`}
            >
              <ActionIcon kind="call" />
              โทร
            </a>
            {checkIn && (
              <div className="flex min-w-0 flex-col">
                <VisitCheckIn
                  leadId={r.lead_id}
                  nextFollowUp={r.next_follow_up}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

/**
 * <UpcomingVisits> — "นัดชมโครงการ" for today, tomorrow and the day after: who comes, which day, what time.
 * Today's rows show arrived / late / call-to-confirm and the check-in button; later days show โทร to confirm.
 * Server component; data from the upcoming_visits RPC. Rows lay out by their own width (CLAUDE.md rule 4).
 */
export function UpcomingVisits({
  rows,
  error,
  ownerFor,
  canLog,
  now,
  days = 3,
  context,
}: {
  rows: VisitRow[];
  /** The RPC failed: say so instead of "no visits". */
  error?: boolean;
  /** Team view: who owns each lead (picture + name). */
  ownerFor?: (r: VisitRow) => Owner | undefined;
  canLog: boolean;
  /** Render time in ms (passed in so the component stays pure). */
  now: number;
  days?: number;
  /** lead id -> recent contacts + liked plots */
  context?: Record<string, VisitContext>;
}) {
  const today = todayISO();
  const dayList = Array.from({ length: days }, (_, i) => addDaysISO(today, i));
  const name = (iso: string, i: number) =>
    `${["วันนี้", "พรุ่งนี้", "มะรืน"][i] ?? ""} ${thDay(iso)}`.trim();

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">
        นัดชมโครงการ {days} วันนี้ ({rows.length} คน)
      </h2>
      {error && <Notice tone="danger">โหลดนัดชมไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง</Notice>}
      <div className="flex flex-col gap-4">
        {dayList.map((iso, i) => {
          const items = rows.filter((r) => r.visit_day === iso);
          return (
            <section
              key={iso}
              className={`flex min-w-0 flex-col overflow-hidden rounded-control border border-t-4 bg-surface ${DAY_STYLE[i]?.border ?? DAY_STYLE[2].border}`}
            >
              <h3
                className={`flex items-center justify-between gap-2 px-3 py-2 font-semibold ${DAY_STYLE[i]?.head ?? DAY_STYLE[2].head}`}
              >
                <span>{name(iso, i)}</span>
                <span
                  className={`inline-flex h-6 shrink-0 items-center rounded-full px-2 text-xs font-medium ${DAY_STYLE[i]?.pill ?? DAY_STYLE[2].pill}`}
                >
                  {items.length} คน
                </span>
              </h3>
              <div className="flex min-w-0 flex-col gap-2 p-3">
                {items.length === 0 ? (
                  <p className="lbl">ไม่มีนัด</p>
                ) : (
                  <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                    {items.map((r) => (
                      <VisitItem
                        key={r.lead_id}
                        r={r}
                        isToday={i === 0}
                        now={now}
                        owner={ownerFor?.(r)}
                        ctx={context?.[r.lead_id]}
                        canLog={canLog}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </Card>
  );
}
