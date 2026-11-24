"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Notice } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";
import { baht } from "@/lib/format";
import { unitStatusOf, type UnitStatus } from "@/config/units";
import { PIN_TONE, STATUS_LETTER } from "./types";

export type ViewerPin = {
  id: string;
  code: string;
  status: UnitStatus;
  interest: number;
  /** Shown in the pin's tooltip when given. */
  price?: number | null;
  /** Fraction of the picture width / height, 0..1. */
  x: number;
  y: number;
};

export type PlanViewerHandle = {
  /** Zoom in on a point (fractions) and center it. */
  focusOn: (x: number, y: number) => void;
};

type T = { x: number; y: number; s: number };

const TAP_SLOP = 6; // px a finger may move and still count as a tap
const MAX_ZOOM = 8; // times the "fit" scale
const FOCUS_ZOOM = 2.5;

/** Site plan picture with pins, zoom and pan by fingers (pinch / drag), mouse drag and mouse wheel.
 *  Pins keep the same size on screen at every zoom. Written with pointer events and a CSS transform.
 *
 *  Edit mode (admin): drag a pin to move it (onMovePin), and tap the plan to place a plot (onPlace). */
export const PlanViewer = forwardRef<
  PlanViewerHandle,
  {
    url: string;
    width: number | null;
    height: number | null;
    pins: ViewerPin[];
    selectedId?: string | null;
    onPinTap?: (id: string) => void;
    /** Point to zoom in on once the picture has loaded. */
    initialFocus?: { x: number; y: number } | null;
    /** Edit mode: pins can be dragged. */
    editable?: boolean;
    onMovePin?: (id: string, x: number, y: number) => void;
    /** Called with the tapped point (fractions) when the user taps the empty plan. */
    onPlace?: (x: number, y: number) => void;
    onError?: () => void;
    className?: string;
  }
>(function PlanViewer(
  { url, width, height, pins, selectedId, onPinTap, initialFocus, editable, onMovePin, onPlace, onError, className = "" },
  ref,
) {
  const viewport = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const t = useRef<T>({ x: 0, y: 0, s: 1 });
  const fit = useRef(1);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{
    startX: number;
    startY: number;
    moved: boolean;
    pinch?: { dist: number; s: number; cx: number; cy: number; tx: number; ty: number };
  } | null>(null);
  const userMoved = useRef(false);

  // Size of the picture in its own pixels: from the database, or read from the file once it loads.
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(
    width && height ? { w: width, h: height } : null,
  );
  const [failed, setFailed] = useState(false);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);

  // Same size in a ref, so handlers that run before the next render (onLoad -> rAF) see it.
  const size = useRef({ w: width ?? 0, h: height ?? 0 });
  const W = natural?.w ?? 0;
  const H = natural?.h ?? 0;

  /** Write the transform straight to the DOM (no re-render while the finger moves). */
  const apply = (next: T, animate = false) => {
    const vp = viewport.current;
    const el = layer.current;
    const { w: W, h: H } = size.current;
    if (!vp || !el || !W) return;
    const min = fit.current;
    const s = Math.min(Math.max(next.s, min), min * MAX_ZOOM);
    // keep at least a quarter of the viewport covered by the picture
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    const pw = W * s;
    const ph = H * s;
    const x = pw <= vw ? (vw - pw) / 2 : Math.min(Math.max(next.x, vw - pw), 0);
    const y = ph <= vh ? (vh - ph) / 2 : Math.min(Math.max(next.y, vh - ph), 0);
    t.current = { x, y, s };
    el.style.transition = animate ? "transform 300ms ease-out" : "none";
    el.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
    el.style.setProperty("--inv", String(1 / s));
  };

  const fitToView = () => {
    const vp = viewport.current;
    const { w: W, h: H } = size.current;
    if (!vp || !W) return;
    fit.current = Math.min(vp.clientWidth / W, vp.clientHeight / H) || 1;
    apply({ x: 0, y: 0, s: fit.current });
  };

  const focusOn = (fx: number, fy: number) => {
    const vp = viewport.current;
    const { w: W, h: H } = size.current;
    if (!vp || !W) return;
    const s = Math.max(t.current.s, fit.current * FOCUS_ZOOM);
    userMoved.current = true;
    apply({ x: vp.clientWidth / 2 - fx * W * s, y: vp.clientHeight / 2 - fy * H * s, s }, true);
  };

  useImperativeHandle(ref, () => ({ focusOn }));

  /** Screen point -> fraction of the picture. */
  const toFraction = (clientX: number, clientY: number) => {
    const r = viewport.current!.getBoundingClientRect();
    const { x, y, s } = t.current;
    const { w: W, h: H } = size.current;
    return {
      x: Math.min(Math.max((clientX - r.left - x) / s / W, 0), 1),
      y: Math.min(Math.max((clientY - r.top - y) / s / H, 0), 1),
    };
  };

  const zoomAt = (clientX: number, clientY: number, s: number) => {
    const r = viewport.current!.getBoundingClientRect();
    const px = clientX - r.left;
    const py = clientY - r.top;
    const cur = t.current;
    const min = fit.current;
    const ns = Math.min(Math.max(s, min), min * MAX_ZOOM);
    // keep the point under the cursor still
    apply({ x: px - ((px - cur.x) / cur.s) * ns, y: py - ((py - cur.y) / cur.s) * ns, s: ns });
  };

  // Mouse wheel needs a non-passive listener to stop the page from scrolling.
  useEffect(() => {
    const vp = viewport.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      if (!W) return;
      e.preventDefault();
      userMoved.current = true;
      zoomAt(e.clientX, e.clientY, t.current.s * Math.exp(-e.deltaY * 0.0015));
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  });

  // Refit when the viewport changes size (rotate the phone, open the sidebar), unless the user zoomed.
  useEffect(() => {
    const vp = viewport.current;
    if (!vp || !W) return;
    const ro = new ResizeObserver(() => {
      const keep = userMoved.current ? { ...t.current } : null;
      fitToView();
      if (keep) apply(keep);
    });
    ro.observe(vp);
    return () => ro.disconnect();
  });

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!W) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (layer.current) layer.current.style.transition = "none";
    if (pointers.current.size === 1) {
      gesture.current = { startX: e.clientX, startY: e.clientY, moved: false };
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = {
        startX: e.clientX,
        startY: e.clientY,
        moved: true,
        pinch: {
          dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
          s: t.current.s,
          cx: (a.x + b.x) / 2,
          cy: (a.y + b.y) / 2,
          tx: t.current.x,
          ty: t.current.y,
        },
      };
      for (const id of pointers.current.keys()) viewport.current?.setPointerCapture(id);
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const prev = pointers.current.get(e.pointerId);
    const g = gesture.current;
    if (!prev || !g) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (g.pinch && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      const r = viewport.current!.getBoundingClientRect();
      const min = fit.current;
      const ns = Math.min(Math.max((g.pinch.s * dist) / g.pinch.dist, min), min * MAX_ZOOM);
      // the picture point that was under the first midpoint follows the fingers
      const ox = g.pinch.cx - r.left;
      const oy = g.pinch.cy - r.top;
      const lx = (ox - g.pinch.tx) / g.pinch.s;
      const ly = (oy - g.pinch.ty) / g.pinch.s;
      apply({ x: cx - r.left - lx * ns, y: cy - r.top - ly * ns, s: ns });
      userMoved.current = true;
      return;
    }

    if (!g.moved && Math.hypot(e.clientX - g.startX, e.clientY - g.startY) < TAP_SLOP) return;
    if (!g.moved) {
      g.moved = true;
      // capture only once it is a drag, so a tap still reaches the pin under the finger
      viewport.current?.setPointerCapture(e.pointerId);
    }
    userMoved.current = true;
    apply({ ...t.current, x: t.current.x + (e.clientX - prev.x), y: t.current.y + (e.clientY - prev.y) });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 1 && g?.pinch) {
      // one finger left after a pinch: continue as a pan from here
      const [p] = [...pointers.current.values()];
      gesture.current = { startX: p.x, startY: p.y, moved: true };
      return;
    }
    if (pointers.current.size > 0) return;
    gesture.current = null;
    if (e.type !== "pointerup" || !g || g.moved || !onPlace) return;
    // a tap on the empty plan (not on a pin) places the chosen plot
    if ((e.target as HTMLElement).closest("[data-pin]")) return;
    const f = toFraction(e.clientX, e.clientY);
    onPlace(f.x, f.y);
  };

  // --- pin drag in edit mode ---
  const onPinPointerDown = (e: React.PointerEvent<HTMLButtonElement>, pin: ViewerPin) => {
    if (!editable) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ id: pin.id, x: pin.x, y: pin.y });
  };
  const onPinPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!editable || !drag) return;
    e.stopPropagation();
    const f = toFraction(e.clientX, e.clientY);
    setDrag({ ...drag, ...f });
  };
  const onPinPointerUp = (e: React.PointerEvent<HTMLButtonElement>, pin: ViewerPin) => {
    if (!editable || !drag) return;
    e.stopPropagation();
    const moved = Math.abs(drag.x - pin.x) * W + Math.abs(drag.y - pin.y) * H > TAP_SLOP / t.current.s;
    if (moved && e.type === "pointerup") onMovePin?.(pin.id, drag.x, drag.y);
    setDrag(null);
  };

  if (failed) {
    return <Notice tone="warn">โหลดรูปผังไม่ได้ เลือกแปลงจากช่องค้นหาหรือรายการด้านล่างได้ตามปกติ</Notice>;
  }

  return (
    <div
      ref={viewport}
      className={`relative h-[60dvh] min-h-64 touch-none select-none overflow-hidden rounded-card border border-line bg-bg ${
        onPlace ? "cursor-crosshair" : "cursor-grab"
      } ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={(e) => zoomAt(e.clientX, e.clientY, t.current.s * 2)}
    >
      <div
        ref={layer}
        className="absolute left-0 top-0 origin-top-left"
        style={{ width: W || undefined, height: H || undefined, visibility: W ? "visible" : "hidden" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- signed URL of a private file, sized by us */}
        <img
          src={url}
          alt="ผังโครงการ"
          draggable={false}
          className="pointer-events-none block h-full w-full max-w-none"
          onLoad={(e) => {
            const img = e.currentTarget;
            if (!size.current.w || !size.current.h) {
              size.current = { w: img.naturalWidth, h: img.naturalHeight };
              setNatural(size.current);
            }
            // wait one frame so the layer has its size, then fit and jump to the focus point
            requestAnimationFrame(() => {
              fitToView();
              if (initialFocus) focusOn(initialFocus.x, initialFocus.y);
            });
          }}
          onError={() => {
            setFailed(true);
            onError?.();
          }}
        />
        {W > 0 &&
          pins.map((p) => {
            const st = unitStatusOf(p.status);
            const pos = drag?.id === p.id ? drag : p;
            const selected = p.id === selectedId;
            const tip = [`แปลง ${p.code}`, st.label, p.price !== undefined ? baht(p.price) : "", p.interest ? `มีคนสนใจ ${p.interest} คน` : ""]
              .filter(Boolean)
              .join(" · ");
            return (
              <Tooltip key={p.id} text={drag ? "" : tip}>
              <button
                type="button"
                data-pin
                aria-label={`แปลง ${p.code} ${st.label}${p.interest ? ` มีคนสนใจ ${p.interest} คน` : ""}`}
                aria-pressed={selected}
                className={`absolute flex h-8 min-w-8 items-center justify-center gap-0.5 rounded-full border-2 px-1 text-xs font-semibold leading-none shadow ${
                  PIN_TONE[st.tone]
                } ${selected ? "z-10 ring-4 ring-ink" : ""} ${editable ? "cursor-move" : ""}`}
                style={{
                  left: `${pos.x * 100}%`,
                  top: `${pos.y * 100}%`,
                  transform: "translate(-50%, -50%) scale(var(--inv, 1))",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onPinTap?.(p.id);
                }}
                onPointerDown={(e) => onPinPointerDown(e, p)}
                onPointerMove={onPinPointerMove}
                onPointerUp={(e) => onPinPointerUp(e, p)}
                onPointerCancel={(e) => onPinPointerUp(e, p)}
              >
                <span aria-hidden className="opacity-80">
                  {STATUS_LETTER[p.status]}
                </span>
                <span aria-hidden>{p.code}</span>
                {p.interest > 0 && (
                  <span
                    aria-hidden
                    className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-xs leading-none text-white"
                  >
                    {p.interest}
                  </span>
                )}
              </button>
              </Tooltip>
            );
          })}
      </div>
    </div>
  );
});
