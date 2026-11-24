"use client";

/**
 * <FloatingPanel> — the one floating box for dropdowns, popovers and the date picker
 * (ported from aoocommerce components/ui/FloatingPanel.tsx + lib/floating.ts).
 *
 *  - Rendered in a portal, so cards and lists that clip overflow cannot cut it.
 *    The portal goes to <body> (our Modal / Sheet / ConfirmCard also live on <body>, below FLOATING_Z),
 *    or into an open native <dialog> if a page ever uses one (it makes everything outside it inert).
 *  - Positioned next to the anchor: flips up/down by free space, kept 8px inside the screen,
 *    never wider than the screen, scrolls inside when taller than the space, follows page scroll
 *    and the phone keyboard.
 *  - `mobileSheet`: below 640px it shows as a bottom sheet instead (calendar, long lists).
 *  - Closes on a tap outside or Esc (`onDismiss`). "Inside" follows the React tree, not the DOM,
 *    so a nested floating box (also portalled) does not close its parent.
 *    Esc is swallowed while open, so it closes only this box and not the Sheet behind it.
 */
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

/** Above the app shell and dialogs. */
export const FLOATING_Z = 9999;
/** Minimum gap to the screen edge (px). */
const EDGE = 8;
/** Narrower than this (px) = phone: `mobileSheet` boxes become a bottom sheet (= Tailwind `sm`). */
export const FLOATING_MOBILE_MAX = 640;

export type FloatingSide = "bottom" | "top";
export type FloatingAlign = "start" | "end" | "center";

type ViewBox = { top: number; left: number; right: number; bottom: number };

/** The part of the screen that is really visible (shrinks when the phone keyboard is up). */
function visibleViewport(): ViewBox {
  const vv = window.visualViewport;
  if (!vv) return { top: 0, left: 0, right: window.innerWidth, bottom: window.innerHeight };
  return { top: vv.offsetTop, left: vv.offsetLeft, right: vv.offsetLeft + vv.width, bottom: vv.offsetTop + vv.height };
}

/** Pure placement maths: flip when the preferred side has no room, clamp inside the screen. */
export function computeFloatingPosition({
  anchor,
  width,
  height,
  placement = "bottom",
  align = "start",
  gap = 4,
  view,
}: {
  anchor: Pick<DOMRect, "top" | "bottom" | "left" | "right" | "width">;
  width: number;
  height: number;
  placement?: FloatingSide;
  align?: FloatingAlign;
  gap?: number;
  view: ViewBox;
}) {
  const spaceBelow = Math.max(0, view.bottom - anchor.bottom - gap - EDGE);
  const spaceAbove = Math.max(0, anchor.top - view.top - gap - EDGE);
  const pref = placement === "top" ? spaceAbove : spaceBelow;
  const other = placement === "top" ? spaceBelow : spaceAbove;
  const otherSide: FloatingSide = placement === "top" ? "bottom" : "top";

  // Preferred side fits -> use it · does not fit but the other does -> flip · neither -> the larger one (and scroll)
  let side: FloatingSide = placement;
  if (height > pref && (height <= other || other > pref)) side = otherSide;
  const avail = side === "bottom" ? spaceBelow : spaceAbove;
  const usedH = Math.min(height, avail);
  const top = side === "bottom" ? anchor.bottom + gap : anchor.top - gap - usedH;

  const maxWidth = Math.max(0, view.right - view.left - EDGE * 2);
  const w = Math.min(width, maxWidth);
  let left =
    align === "end" ? anchor.right - w : align === "center" ? anchor.left + anchor.width / 2 - w / 2 : anchor.left;
  left = Math.min(Math.max(left, view.left + EDGE), view.right - EDGE - w);

  return { top, left, maxHeight: avail, maxWidth, side };
}

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Writes top/left/max-height straight onto the panel before paint, on every render and on scroll/resize. */
function useFloatingPosition(
  anchorRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
  {
    open,
    placement,
    align,
    gap,
    disabled,
    matchWidth,
  }: { open: boolean; placement: FloatingSide; align: FloatingAlign; gap: number; disabled: boolean; matchWidth?: "min" | "exact" },
) {
  const active = open && !disabled;

  // Re-measure on every render while open: content or anchor may move without an event.
  useIsoLayoutEffect(() => {
    if (!active) return;
    const update = () => {
      const a = anchorRef.current;
      const p = panelRef.current;
      if (!a || !p) return;
      const view = visibleViewport();
      const rect = a.getBoundingClientRect();
      const s = p.style;
      const keepScrollTop = p.scrollTop;
      s.maxHeight = "";
      if (matchWidth === "min") s.minWidth = `${rect.width}px`;
      if (matchWidth === "exact") s.width = `${rect.width}px`;
      s.maxWidth = `${Math.max(0, view.right - view.left - EDGE * 2)}px`;
      const pos = computeFloatingPosition({
        anchor: rect,
        width: p.offsetWidth,
        height: p.offsetHeight,
        placement,
        align,
        gap,
        view,
      });
      s.top = `${pos.top}px`;
      s.left = `${pos.left}px`;
      s.maxHeight = `${pos.maxHeight}px`;
      s.overflowY = p.scrollHeight > pos.maxHeight + 1 ? "auto" : "";
      if (keepScrollTop) p.scrollTop = keepScrollTop;
      p.dataset.side = pos.side;
    };
    update();

    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };
    // capture = hear scrolling of any box on the page (scroll does not bubble); scrolling inside the panel is ignored
    const onScroll = (e: Event) => {
      const p = panelRef.current;
      if (p && e.target instanceof Node && p.contains(e.target)) return;
      schedule();
    };
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", onScroll, true);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", schedule);
    vv?.addEventListener("scroll", schedule);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    if (panelRef.current) ro?.observe(panelRef.current);
    if (anchorRef.current) ro?.observe(anchorRef.current);
    return () => {
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", onScroll, true);
      vv?.removeEventListener("resize", schedule);
      vv?.removeEventListener("scroll", schedule);
      ro?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  });
}

const MOBILE_QUERY = `(max-width: ${FLOATING_MOBILE_MAX - 0.02}px)`;

function subscribeMobile(cb: () => void) {
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** True on phone-width screens (below 640px). */
export function useIsMobileViewport(): boolean {
  return useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  );
}

/** How much of the bottom edge the phone keyboard covers (px): the bottom sheet must sit above it. */
function subscribeViewport(cb: () => void) {
  const vv = window.visualViewport;
  vv?.addEventListener("resize", cb);
  vv?.addEventListener("scroll", cb);
  return () => {
    vv?.removeEventListener("resize", cb);
    vv?.removeEventListener("scroll", cb);
  };
}
function keyboardInset(): number {
  const vv = window.visualViewport;
  return vv ? Math.max(0, Math.round(window.innerHeight - vv.offsetTop - vv.height)) : 0;
}

/** Where to portal a floating box opened from `el`: an open native <dialog> it sits in, else <body>
 *  (Modal-based sheets are on <body> already).
 *  Call it from an event handler (it reads the DOM). */
export function floatingContainerFor(el: Element | null): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return (el?.closest("dialog[open]") as HTMLElement | null) ?? document.body;
}

export interface FloatingPanelProps {
  open: boolean;
  /** The button/field the box sticks to. A tap here is not "outside" (the caller toggles). */
  anchorRef: RefObject<HTMLElement | null>;
  /** Close on a tap outside / Esc. Leave out to handle it yourself. */
  onDismiss?: () => void;
  placement?: FloatingSide;
  align?: FloatingAlign;
  gap?: number;
  /** Bottom sheet on phones (backdrop, full width, at most 85% of the visible height). */
  mobileSheet?: boolean;
  /** Width from the anchor: "min" = at least as wide · "exact" = same width (dropdown lists). */
  matchWidth?: "min" | "exact";
  /** Portal target. Default <body>; pass `floatingContainerFor(anchor)` when the anchor may be in a <dialog>. */
  container?: HTMLElement | null;
  panelRef?: RefObject<HTMLDivElement | null>;
  className?: string;
  /** Never pass top/left/maxHeight: the panel writes them itself. */
  style?: CSSProperties;
  /** Stop clicks inside from reaching React parents (e.g. a clickable row). Default true. */
  stopPropagation?: boolean;
  role?: string;
  id?: string;
  ariaLabel?: string;
  children: ReactNode;
}

export function FloatingPanel({
  open,
  anchorRef,
  onDismiss,
  placement = "bottom",
  align = "start",
  gap = 4,
  mobileSheet = false,
  matchWidth,
  container,
  panelRef: externalRef,
  className = "",
  style,
  stopPropagation = true,
  role,
  id,
  ariaLabel,
  children,
}: FloatingPanelProps) {
  const ownRef = useRef<HTMLDivElement>(null);
  const panelRef = externalRef ?? ownRef;
  const isMobile = useIsMobileViewport();
  const sheet = mobileSheet && isMobile;
  const inset = useSyncExternalStore(subscribeViewport, keyboardInset, () => 0);
  const kbInset = open && sheet ? inset : 0;

  useFloatingPosition(anchorRef, panelRef, { open, placement, align, gap, disabled: sheet, matchWidth });

  // "Inside" by React tree: React handles pointerdown at its root before the event reaches window,
  // so a child box portalled elsewhere still counts as inside this one.
  const insideRef = useRef(false);
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);
  const dismissible = Boolean(onDismiss);

  useEffect(() => {
    if (!open || !dismissible) return;
    const reset = () => {
      insideRef.current = false;
    };
    const onDown = (e: PointerEvent) => {
      if (insideRef.current) {
        insideRef.current = false;
        return;
      }
      const t = e.target as Node | null;
      if (t && anchorRef.current?.contains(t)) return;
      if (t && panelRef.current?.contains(t)) return;
      // Bottom sheet: the backdrop closes on click (so the tap does not fall through to what is underneath)
      if (t instanceof Element && t.closest("[data-floating-backdrop]")) return;
      onDismissRef.current?.();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Keep the Modal / Sheet behind us open: it skips an Esc that was already prevented.
      e.preventDefault();
      e.stopPropagation();
      onDismissRef.current?.();
    };
    window.addEventListener("pointerdown", reset, true);
    window.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", reset, true);
      window.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, dismissible, anchorRef, panelRef]);

  if (typeof document === "undefined" || !open) return null;
  const target = container ?? document.body;

  const markInside = () => {
    insideRef.current = true;
  };
  const stop = stopPropagation ? (e: React.SyntheticEvent) => e.stopPropagation() : undefined;

  if (sheet) {
    return createPortal(
      <>
        <div
          data-floating-backdrop=""
          className="fixed inset-0 bg-black/40"
          style={{ zIndex: FLOATING_Z }}
          onPointerDown={markInside}
          onClick={(e) => {
            e.stopPropagation();
            onDismissRef.current?.();
          }}
        />
        <div
          ref={panelRef}
          data-floating-panel="sheet"
          role={role}
          id={id}
          aria-label={ariaLabel}
          onPointerDown={markInside}
          onClick={stop}
          className={`fixed inset-x-0 overflow-y-auto overscroll-contain rounded-t-card bg-surface text-ink shadow-2xl ${className}`}
          style={{
            ...style,
            width: "auto",
            minWidth: 0,
            maxWidth: "none",
            top: "auto",
            left: 0,
            right: 0,
            zIndex: FLOATING_Z,
            bottom: kbInset,
            maxHeight: `calc(${kbInset ? `${window.visualViewport?.height ?? window.innerHeight}px` : "100dvh"} * 0.85)`,
            paddingBottom: kbInset ? undefined : "env(safe-area-inset-bottom)",
          }}
        >
          <div className="flex justify-center pt-2 pb-1" aria-hidden>
            <span className="h-1 w-10 rounded-full bg-line-strong" />
          </div>
          {children}
        </div>
      </>,
      target,
    );
  }

  return createPortal(
    <div
      ref={panelRef}
      data-floating-panel=""
      role={role}
      id={id}
      aria-label={ariaLabel}
      onPointerDown={markInside}
      onClick={stop}
      className={`fixed text-ink ${className}`}
      style={{ ...style, zIndex: FLOATING_Z }}
    >
      {children}
    </div>,
    target,
  );
}
