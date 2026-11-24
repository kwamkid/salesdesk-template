"use client";

import { useState } from "react";
import { ActionIcon, Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { unitStatusOf } from "@/config/units";
import { PlanViewer } from "./plan-viewer";
import { hasPin, isFree, type BoardUnit, type PlanView } from "./types";
import { Tooltip } from "@/components/ui/tooltip";

/**
 * <PlotMapPicker> — the one way to pick a plot (use it inside any dialog that needs a plot).
 *  1. Site plan with pins (when the project has a plan picture with pins): tap a pin.
 *  2. Every plot as a block, grouped by zone and coloured by status (always shown, so it works with no plan).
 *  3. A search box that narrows the blocks by plot code. No floating dropdown, so a modal never clips it.
 */
export function PlotMapPicker({
  units,
  plans = [],
  selectedId,
  marked,
  onPick,
}: {
  units: BoardUnit[];
  /** Site plans with a signed picture url (loadPlans). */
  plans?: PlanView[];
  selectedId: string | null;
  /** Plots to ring (e.g. already of interest). */
  marked?: Set<string>;
  onPick: (unit: BoardUnit) => void;
}) {
  const [q, setQ] = useState("");
  const plansWithPins = plans.filter(
    (p) => p.url && units.some((u) => u.plan_id === p.id && hasPin(u)),
  );
  const [planId, setPlanId] = useState(() => plansWithPins[0]?.id ?? null);
  const plan =
    plansWithPins.find((p) => p.id === planId) ?? plansWithPins[0] ?? null;
  const picked = units.find((u) => u.id === selectedId) ?? null;
  const interest = marked ?? new Set<string>();
  // Taken plots (จอง · ทำสัญญา · โอน) belong to another customer: shown, but cannot be picked.
  const setPicked = (u: BoardUnit | null) => u && isFree(u.status) && onPick(u);
  const needle = q.trim().toUpperCase();
  const shown = units
    .filter((u) => !needle || u.code.toUpperCase().includes(needle))
    .sort((a, b) => a.code.localeCompare(b.code, "th", { numeric: true }));
  const zones = [
    ...shown.reduce(
      (m, u) => m.set(u.zone, [...(m.get(u.zone) ?? []), u]),
      new Map<string, BoardUnit[]>(),
    ),
  ].sort((a, b) => a[0].localeCompare(b[0], "th"));

  return (
    <div className="flex flex-col gap-3">
      {/* 1. Site plan: tap a pin */}
      {plan && (
        <div className="flex flex-col gap-2">
          {plansWithPins.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {plansWithPins.map((p) => (
                <Button
                  key={p.id}
                  variant={p.id === plan.id ? "primary" : "secondary"}
                  onClick={() => setPlanId(p.id)}
                >
                  {p.name}
                </Button>
              ))}
            </div>
          )}
          <PlanViewer
            key={plan.id}
            url={plan.url!}
            width={plan.image_w}
            height={plan.image_h}
            pins={units
              .filter((u) => u.plan_id === plan.id && hasPin(u))
              .map((u) => ({
                id: u.id,
                code: u.code,
                status: u.status,
                interest: u.interest_count,
                price: u.price,
                x: u.pos_x!,
                y: u.pos_y!,
              }))}
            selectedId={picked?.id ?? null}
            onPinTap={(id) => setPicked(units.find((u) => u.id === id) ?? null)}
          />
        </div>
      )}

      {/* 2. Every plot as a block (also when there is no plan); type to narrow it down */}
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft">
          <ActionIcon kind="search" />
        </span>
        <Input
          className="pl-10"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นเลขแปลง เช่น A07"
          aria-label="ค้นเลขแปลง"
        />
      </div>
      <div className="flex max-h-[40dvh] flex-col gap-3 overflow-y-auto">
        {zones.map(([zone, list]) => (
          <div key={zone || "-"} className="flex flex-col gap-1.5">
            {zone && <p className="text-sm text-ink-soft">โซน {zone}</p>}
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-1.5">
              {list.map((u) => {
                const st = unitStatusOf(u.status);
                const on = picked?.id === u.id;
                const free =
                  u.status === "available" || u.status === "interested";
                return (
                  <li key={u.id}>
                    <Tooltip text={free ? "" : `${st.label}แล้ว เลือกไม่ได้`}>
                      <button
                        type="button"
                        disabled={!free}
                        onClick={() => setPicked(u)}
                        aria-pressed={on}
                        aria-label={`แปลง ${u.code} ${st.label}`}
                        className={`flex min-h-11 w-full flex-col items-center justify-center rounded-control border px-1 py-1 text-base transition-all ${
                          on
                            ? "border-brand bg-brand text-brand-ink shadow-card"
                            : free
                              ? "border-ok bg-ok-soft text-ink hover:-translate-y-0.5"
                              : "cursor-not-allowed border-line bg-line text-ink-soft opacity-70"
                        } ${interest.has(u.id) && !on ? "ring-2 ring-brand" : ""}`}
                      >
                        {u.code}
                        <span className="text-xs">{st.label}</span>
                      </button>
                    </Tooltip>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {zones.length === 0 && <p className="text-ink-soft">ไม่พบแปลง “{q}”</p>}
      </div>
    </div>
  );
}
