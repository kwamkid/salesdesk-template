"use client";

/**
 * <Tooltip> — the label of an icon button, or the full text of a cut-off box
 * (ported from aoocommerce components/ui/Tooltip.tsx). Use it instead of title="".
 *
 *   Tooltip  = shows on hover, keyboard focus, or a long press on phones. "What is this button?"
 *   HelpHint = an ⓘ you tap to read a one-line explanation (works on phones without long press).
 *
 * The icon button still needs its own Thai aria-label: the tooltip is for eyes, not screen readers.
 *
 * <Tooltip text="แก้ไข"><button aria-label="แก้ไข">…</button></Tooltip>
 */
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { FLOATING_Z } from "./floating-panel";

const GAP = 8;
const EDGE = 8;
const ARROW_INSET = 10;
const SHOW_DELAY = 350;
const LONG_PRESS = 400;
const TOUCH_LINGER = 2500;

export interface TooltipProps {
  children: ReactNode;
  /** Text. New line with "\n". Empty = no tooltip at all. */
  text: string;
  /** Preferred side; flips when there is no room. */
  position?: "top" | "bottom";
  /** "contents" (default) adds no box, so the layout does not move.
   *  "inline-flex" adds a real box: needed around a button that can be disabled
   *  (a disabled button fires no pointer events). */
  box?: "contents" | "inline-flex";
  delay?: number;
  /** Show only when the first child's text is actually cut off (truncate / line-clamp). */
  onlyWhenClipped?: boolean;
}

interface Pos {
  top: number;
  left: number;
  up: boolean;
  arrow: number;
}

function anchorRect(host: HTMLElement | null): DOMRect | null {
  if (!host) return null;
  const own = host.getBoundingClientRect();
  if (own.width || own.height) return own;
  let left = Infinity,
    top = Infinity,
    right = -Infinity,
    bottom = -Infinity;
  for (const kid of Array.from(host.children)) {
    const k = kid.getBoundingClientRect();
    if (!k.width && !k.height) continue;
    left = Math.min(left, k.left);
    top = Math.min(top, k.top);
    right = Math.max(right, k.right);
    bottom = Math.max(bottom, k.bottom);
  }
  if (left === Infinity) return null;
  return new DOMRect(left, top, right - left, bottom - top);
}

const anchorEl = (host: HTMLElement | null): HTMLElement | null =>
  (host?.firstElementChild as HTMLElement | null) ?? host;

function isKeyboardFocus(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node?.matches) return false;
  try {
    return node.matches(":focus-visible");
  } catch {
    return true;
  }
}

/** Thai tone marks stack high, so line-clamp is measured with 4px slack. */
function isClipped(el: HTMLElement | null): boolean {
  if (!el) return false;
  if (getComputedStyle(el).whiteSpace === "nowrap") return el.scrollWidth > el.clientWidth + 1;
  return el.scrollHeight > el.clientHeight + 4;
}

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function Tooltip({
  children,
  text,
  position = "top",
  box = "contents",
  delay = SHOW_DELAY,
  onlyWhenClipped = false,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const hostRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const showTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  /** A long press showed the tip: swallow the click that follows so the button does not fire. */
  const swallowClick = useRef(false);
  const tipId = useId();
  const wantTop = position === "top";

  const clearTimers = useCallback(() => {
    if (showTimer.current) {
      clearTimeout(showTimer.current);
      showTimer.current = null;
    }
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearTimers();
    setVisible(false);
    setPos(null);
  }, [clearTimers]);

  useEffect(() => clearTimers, [clearTimers]);

  const place = useCallback(() => {
    const rect = anchorRect(hostRef.current);
    if (!rect) return;
    const tip = tipRef.current;
    const th = tip?.offsetHeight || 32;
    const tw = tip?.offsetWidth || 0;
    const need = th + GAP;
    const roomAbove = rect.top;
    const roomBelow = window.innerHeight - rect.bottom;
    const up = wantTop ? roomAbove >= need || roomAbove > roomBelow : !(roomBelow >= need || roomBelow > roomAbove);
    const center = rect.left + rect.width / 2;
    const half = tw / 2;
    const min = EDGE + half;
    const max = window.innerWidth - EDGE - half;
    const left = max < min ? window.innerWidth / 2 : Math.min(Math.max(center, min), max);
    const limit = Math.max(0, half - ARROW_INSET);
    const arrow = Math.min(limit, Math.max(-limit, center - left));
    const top = up ? rect.top - GAP : rect.bottom + GAP;
    setPos((prev) =>
      prev && prev.top === top && prev.left === left && prev.up === up && prev.arrow === arrow
        ? prev
        : { top, left, up, arrow },
    );
  }, [wantTop]);

  useIsoLayoutEffect(() => {
    if (!visible) return;
    place();
  }, [visible, place, text]);

  useEffect(() => {
    if (!visible) return;
    const onMove = () => hide();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [visible, hide]);

  useEffect(() => {
    const el = anchorEl(hostRef.current);
    if (!el) return;
    if (!visible) {
      el.removeAttribute("aria-describedby");
      return;
    }
    el.setAttribute("aria-describedby", tipId);
    return () => el.removeAttribute("aria-describedby");
  }, [visible, tipId]);

  if (!text) return <>{children}</>;

  const worthShowing = () => !onlyWhenClipped || isClipped(anchorEl(hostRef.current));

  return (
    <span
      ref={hostRef}
      style={box === "contents" ? { display: "contents" } : undefined}
      className={box === "inline-flex" ? "inline-flex" : undefined}
      onPointerEnter={(e) => {
        if (e.pointerType === "touch") return;
        clearTimers();
        showTimer.current = window.setTimeout(() => {
          if (worthShowing()) setVisible(true);
        }, delay);
      }}
      onPointerLeave={hide}
      onPointerDown={(e) => {
        swallowClick.current = false;
        clearTimers();
        if (e.pointerType !== "touch") {
          hide();
          return;
        }
        showTimer.current = window.setTimeout(() => {
          showTimer.current = null;
          if (!worthShowing()) return;
          swallowClick.current = true;
          setVisible(true);
          hideTimer.current = window.setTimeout(() => {
            swallowClick.current = false;
            hide();
          }, TOUCH_LINGER);
        }, LONG_PRESS);
      }}
      onPointerUp={(e) => {
        if (e.pointerType !== "touch") return;
        if (showTimer.current) {
          clearTimeout(showTimer.current);
          showTimer.current = null;
        }
      }}
      onPointerCancel={() => {
        if (!swallowClick.current) hide();
      }}
      onFocus={(e) => {
        if (isKeyboardFocus(e.target) && worthShowing()) setVisible(true);
      }}
      onBlur={hide}
      onClickCapture={(e) => {
        if (!swallowClick.current) return;
        swallowClick.current = false;
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {children}
      {visible &&
        createPortal(
          <div
            ref={tipRef}
            id={tipId}
            role="tooltip"
            className="pointer-events-none fixed w-max"
            style={
              pos
                ? {
                    top: pos.top,
                    left: pos.left,
                    transform: `translate(-50%, ${pos.up ? "-100%" : "0"})`,
                    zIndex: FLOATING_Z + 1,
                  }
                : { top: 0, left: 0, visibility: "hidden", zIndex: FLOATING_Z + 1 }
            }
          >
            <div className="relative max-w-[min(20rem,calc(100vw-1rem))] rounded-control bg-tooltip px-3 py-2 text-sm break-words text-tooltip-ink shadow-lg">
              {text.includes("\n") ? text.split("\n").map((line, i) => <div key={i}>{line}</div>) : text}
              <div
                className={`absolute h-2 w-2 -translate-x-1/2 rotate-45 bg-tooltip ${(pos ? pos.up : wantTop) ? "-bottom-1" : "-top-1"}`}
                style={{ left: `calc(50% + ${pos?.arrow ?? 0}px)` }}
              />
            </div>
          </div>,
          document.body,
        )}
    </span>
  );
}
