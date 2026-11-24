"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState, Notice } from "@/components/ui/card";
import type { Role } from "@/config/roles";
import { UNIT_STATUS, unitStatusOf } from "@/config/units";
import { baht, num } from "@/lib/format";
import { NoMatchIcon, PlotsIcon } from "@/lib/icons";
import { createClient } from "@/lib/supabase/client";
import { PlanViewer, type PlanViewerHandle } from "./plan-viewer";
import { PlotPicker } from "./plot-picker";
import { StatusSummary, type PlotFilter } from "./status-summary";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { hasPin, hhmm, STATUS_LETTER, type BoardUnit, type PlanView } from "./types";
import { UnitSheet } from "./unit-sheet";
import type { HouseModel } from "@/components/projects/load";
import { houseCategoryOf } from "@/config/houses";

const PAGE = 30;

/** True from the lg breakpoint (1024px): the plan and the list then sit side by side. False on the server. */
const WIDE = "(min-width: 1024px)";
function useWide() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(WIDE);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
}

/** Plot page body: summary, plan tabs, zoomable plan with pins, list, search, and the plot sheet.
 *  Starts from the server's unit_board() rows, then stays live with Supabase Realtime
 *  (re-calls unit_board on every change of the project's units). Mount with key={projectId}. */
export function PlotBoard({
  projectId,
  initialUnits,
  plans,
  models = [],
  role,
  meId,
  initialUnit,
  initialFilter = "all",
}: {
  projectId: string;
  initialUnits: BoardUnit[];
  plans: PlanView[];
  /** House models of the project (with picture URLs), for the plot sheet. */
  models?: HouseModel[];
  role: Role;
  meId: string;
  /** Unit id or code from ?unit= to select on open. */
  initialUnit?: string;
  /** Status tab from ?status= to start on. */
  initialFilter?: PlotFilter;
}) {
  const [supabase] = useState(() => createClient());
  const [units, setUnits] = useState(initialUnits);
  const [live, setLive] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  const [refreshing, setRefreshing] = useState(false);

  const start = initialUnit
    ? initialUnits.find((u) => u.id === initialUnit || u.code.toUpperCase() === initialUnit.toUpperCase())
    : undefined;
  const plansWithPicture = plans.filter((p) => p.url);
  const [planId, setPlanId] = useState<string | null>(
    (start && hasPin(start) && plansWithPicture.some((p) => p.id === start.plan_id) ? start.plan_id : null) ??
      plansWithPicture[0]?.id ??
      null,
  );
  const [selectedId, setSelectedId] = useState<string | null>(start?.id ?? null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [view, setView] = useState<"plan" | "list">(plansWithPicture.length ? "plan" : "list");
  const [filter, setFilter] = useState<PlotFilter>(initialFilter);
  const [shown, setShown] = useState(PAGE);
  const [planFailed, setPlanFailed] = useState<Record<string, boolean>>({});
  const viewer = useRef<PlanViewerHandle>(null);
  const wide = useWide();

  const refetch = useCallback(async () => {
    const { data, error } = await supabase.rpc("unit_board", { p_project: projectId });
    if (!error && data) {
      setUnits(data as BoardUnit[]);
      setUpdatedAt(new Date());
    }
    return !error;
  }, [supabase, projectId]);

  // Realtime: any change to this project's plots -> one fresh unit_board call (debounced).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(refetch, 300);
    };
    const channel = supabase
      .channel(`units:${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "units", filter: `project_id=eq.${projectId}` }, schedule)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setLive(true);
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setLive(false);
      });
    const onFocus = () => schedule();
    const onVisible = () => document.visibilityState === "visible" && schedule();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [supabase, projectId, refetch]);

  const manualRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const visible = filter === "all" ? units : units.filter((u) => u.status === filter);
  const plan = plansWithPicture.find((p) => p.id === planId) ?? null;
  const planPins = plan
    ? visible
        .filter((u) => u.plan_id === plan.id && u.pos_x !== null && u.pos_y !== null)
        .map((u) => ({ id: u.id, code: u.code, status: u.status, interest: u.interest_count, price: u.price, x: u.pos_x!, y: u.pos_y! }))
    : [];
  const planReady = Boolean(plan && !planFailed[plan.id]);
  // Phones and tablets: plan OR list (toggle). lg+: both, plan ~2/3 and the list beside it.
  const split = wide && planReady;
  const planOn = view === "plan" || wide;
  const showPlan = planOn && planReady;
  const showList = view === "list" || !planReady || wide;
  const selected = units.find((u) => u.id === selectedId) ?? null;
  const sheetUnit = units.find((u) => u.id === sheetId) ?? null;

  /** Picked from the search box: move the plan to the pin and highlight it, or open the sheet. */
  const pickUnit = (u: BoardUnit) => {
    setSelectedId(u.id);
    const target = hasPin(u) ? plansWithPicture.find((p) => p.id === u.plan_id) : undefined;
    if (!target || planFailed[target.id]) {
      setSheetId(u.id);
      return;
    }
    if (filter !== "all" && u.status !== filter) setFilter("all");
    setView("plan");
    if (target.id === planId && planOn) viewer.current?.focusOn(u.pos_x!, u.pos_y!);
    else setPlanId(target.id); // the new viewer focuses on the selected pin once its picture loads
  };

  const initialFocus = selected && plan && selected.plan_id === plan.id && hasPin(selected)
    ? { x: selected.pos_x!, y: selected.pos_y! }
    : null;

  if (units.length === 0) {
    return (
      <EmptyState
        icon={PlotsIcon}
        tone="info"
        title="โครงการนี้ยังไม่มีรายการแปลง"
        hint={role === "admin" ? "นำเข้ารายการแปลงได้ที่หน้าจัดการโครงการ" : "รอแอดมินนำเข้ารายการแปลง"}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Summary, search and view controls: one wrapping row from md. */}
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
        <div className="min-w-0 md:flex-[1_1_22rem]">
          <StatusSummary
            units={units}
            active={filter}
            onSelect={(k) => {
              setFilter(k);
              setShown(PAGE);
            }}
          />
        </div>
        <div className="min-w-0 md:w-72">
          <PlotPicker
            units={visible}
            onPick={pickUnit}
            describe={(u) => (u.interest_count ? `สนใจ ${u.interest_count}` : "")}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {plansWithPicture.length === 0 ? (
            <p className="text-sm text-ink-soft">โครงการนี้ยังไม่มีรูปผัง แสดงเป็นรายการ</p>
          ) : (
            !wide && (
              <div role="group" aria-label="มุมมอง" className="flex rounded-control border border-line bg-surface p-0.5">
                {(["plan", "list"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={view === v}
                    onClick={() => setView(v)}
                    className={`min-h-11 rounded-control px-4 text-sm font-medium ${view === v ? "bg-brand text-brand-ink" : "text-ink"}`}
                  >
                    {v === "plan" ? "ผัง" : "รายการ"}
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {!live && (
        <div className="flex items-center justify-between gap-3 rounded-control bg-warn-soft px-3 text-sm text-warn-ink">
          <span suppressHydrationWarning>การเชื่อมต่อสดหลุด · อัปเดตล่าสุด {hhmm(updatedAt)}</span>
          <Button variant="ghost" onClick={manualRefresh} disabled={refreshing}>
            {refreshing ? "กำลังโหลด" : "รีเฟรช"}
          </Button>
        </div>
      )}

      {planOn && plansWithPicture.length > 1 && (
        <div role="tablist" aria-label="ผังแต่ละโซน" className="flex gap-2 overflow-x-auto">
          {plansWithPicture.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={p.id === planId}
              onClick={() => setPlanId(p.id)}
              className={`min-h-11 shrink-0 rounded-control border px-4 text-sm font-medium ${
                p.id === planId ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-ink"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {planOn && plan && planFailed[plan.id] && (
        <Notice tone="warn">โหลดรูปผังไม่ได้ เลือกแปลงจากช่องค้นหาหรือรายการด้านล่างได้ตามปกติ</Notice>
      )}

      <div className={split ? "grid items-start gap-4 lg:grid-cols-3" : "flex flex-col gap-3"}>
        {showPlan && plan && (
          <div className="flex min-w-0 flex-col gap-3 lg:col-span-2">
            <PlanViewer
              key={plan.id}
              ref={viewer}
              url={plan.url!}
              width={plan.image_w}
              height={plan.image_h}
              pins={planPins}
              selectedId={selectedId}
              initialFocus={initialFocus}
              onPinTap={(id) => {
                setSelectedId(id);
                setSheetId(id);
              }}
              onError={() => setPlanFailed((f) => ({ ...f, [plan.id]: true }))}
            />
            {planPins.length === 0 && (
              <Notice tone="warn">ผังนี้ยังไม่มีหมุด{filter !== "all" ? "ของแปลงในแท็บนี้" : ""} เลือกแปลงจากช่องค้นหาหรือรายการแทน</Notice>
            )}
            <Legend />
            {selected && (
              <div className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface p-3">
                <p className="min-w-0 truncate">
                  <span className="font-medium">แปลง {selected.code}</span>{" "}
                  <Badge tone={unitStatusOf(selected.status).tone}>{unitStatusOf(selected.status).label}</Badge>
                  {!hasPin(selected) && <span className="ml-2 text-sm text-ink-soft">ยังไม่มีหมุดบนผัง</span>}
                </p>
                <Button variant="secondary" onClick={() => setSheetId(selected.id)}>
                  ดูรายละเอียด
                </Button>
              </div>
            )}
          </div>
        )}

        {showList && (
          <div className={split ? "min-w-0 lg:max-h-[75dvh] lg:overflow-y-auto" : "min-w-0"}>
            <UnitList
              compact={split}
              units={visible}
              shown={shown}
              onMore={() => setShown((n) => n + PAGE)}
              onOpen={(id) => {
                setSelectedId(id);
                setSheetId(id);
              }}
            />
          </div>
        )}
      </div>

      {live && <p suppressHydrationWarning className="text-xs text-ink-soft">สถานะอัปเดตอัตโนมัติ · ล่าสุด {hhmm(updatedAt)}</p>}

      <UnitSheet
        key={sheetUnit?.id ?? "none"}
        unit={sheetUnit}
        model={models.find((m) => m.id === sheetUnit?.house_model_id) ?? null}
        projectId={projectId}
        role={role}
        meId={meId}
        onClose={() => setSheetId(null)}
        onChanged={() => void refetch()}
      />
    </div>
  );
}

function Legend() {
  return (
    <ul aria-label="ความหมายของหมุด" className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-soft">
      {UNIT_STATUS.map((s) => (
        <li key={s.key} className="flex items-center gap-1">
          <Badge tone={s.tone}>{STATUS_LETTER[s.key]}</Badge>
          {s.label}
        </li>
      ))}
      <li>ตัวเลขสีแดง = จำนวนคนสนใจ</li>
    </ul>
  );
}

/** Plot list: a table from 1024px (3 short columns beside the plan), cards below. 30 rows at a time. */
export function UnitList({
  units,
  shown,
  onMore,
  onOpen,
  compact = false,
}: {
  units: BoardUnit[];
  shown: number;
  onMore: () => void;
  onOpen: (id: string) => void;
  /** Narrow column next to the plan: code, status and price only. */
  compact?: boolean;
}) {
  const houseOf = (u: BoardUnit) =>
    // a plot with a model: "บ้านเดี่ยว แบบ Ivy"; otherwise the imported text
    u.model_name ? `${houseCategoryOf(u.model_category).label} แบบ ${u.model_name}` : u.house_type;
  const status = (u: BoardUnit) => {
    const st = unitStatusOf(u.status);
    return <Badge tone={st.tone}>{st.label}</Badge>;
  };
  const columns: DataTableColumn<BoardUnit>[] = compact
    ? [
        { key: "code", header: "แปลง", sortable: true, render: (u) => <span className="font-medium">{u.code}</span> },
        { key: "status", header: "สถานะ", render: status },
        { key: "price", header: "ราคา", align: "right", sortable: true, render: (u) => baht(u.price) },
      ]
    : [
        { key: "code", header: "แปลง", sortable: true, render: (u) => <span className="font-medium">{u.code}</span> },
        { key: "zone", header: "โซน", sortable: true, render: (u) => u.zone || "-" },
        { key: "house_type", header: "แบบบ้าน", sortable: true, sortValue: houseOf, render: (u) => houseOf(u) || "-" },
        { key: "land_sqw", header: "ที่ดิน (ตร.ว.)", align: "right", sortable: true, render: (u) => num(u.land_sqw), defaultHidden: true },
        { key: "usable_sqm", header: "ใช้สอย (ตร.ม.)", align: "right", sortable: true, render: (u) => num(u.usable_sqm), defaultHidden: true },
        { key: "price", header: "ราคา", align: "right", sortable: true, render: (u) => baht(u.price) },
        { key: "interest_count", header: "คนสนใจ", align: "right", sortable: true, render: (u) => (u.interest_count ? `${u.interest_count} คน` : "-") },
        { key: "status", header: "สถานะ", sortable: true, render: status },
      ];
  return (
    <DataTable
      columns={columns}
      data={units.slice(0, shown)}
      rowKey="id"
      onRowClick={(u) => onOpen(u.id)}
      storageKey={compact ? undefined : "plots"}
      caption="รายการแปลง"
      emptyState={<EmptyState icon={NoMatchIcon} tone="neutral" title="ไม่มีแปลงที่ตรงกับตัวกรอง" hint="ลองเลือกแท็บทั้งหมด" />}
      mobileCardRender={(u) => (
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0">
            <span className="block font-medium">
              {u.code}
              {u.zone && <span className="ml-2 text-sm font-normal text-ink-soft">โซน {u.zone}</span>}
            </span>
            <span className="block truncate text-sm text-ink-soft">
              {[houseOf(u), baht(u.price), u.interest_count ? `สนใจ ${u.interest_count} คน` : ""].filter(Boolean).join(" · ")}
            </span>
          </span>
          {status(u)}
        </div>
      )}
      footer={
        units.length > shown && (
          <Button variant="secondary" full onClick={onMore}>
            แสดงเพิ่ม ({units.length - shown} แปลง)
          </Button>
        )
      }
    />
  );
}
