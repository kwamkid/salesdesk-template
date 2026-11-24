"use client";

/**
 * <Popover> — a small floating box stuck to a button (ported from aoocommerce Popover.tsx).
 * Content can be anything (details, a field, buttons). The caller owns open / onClose.
 *
 *   ActionMenu = a list of actions · HelpHint = a read-only explanation · Popover = anything else
 *
 * Drawn through FloatingPanel: portal on <body> (above open modals), flips up/down, stays inside
 * the screen, closes on a tap outside or Esc (Esc does not close the Modal behind it).
 *
 * const ref = useRef<HTMLButtonElement>(null);
 * <button ref={ref} onClick={() => setOpen(!open)}>…</button>
 * <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref}>…</Popover>
 */
import type { ReactNode, RefObject } from "react";
import { FloatingPanel } from "./floating-panel";

export function Popover({
  open,
  onClose,
  anchorRef,
  children,
  align = "end",
  width = 288,
  ariaLabel,
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  /** The button that opens it: anchors the box, and a tap on it is not "outside". */
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  align?: "start" | "end" | "center";
  /** Width in px; narrower screens shrink it to fit. */
  width?: number;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <FloatingPanel
      open={open}
      anchorRef={anchorRef}
      onDismiss={onClose}
      align={align}
      gap={6}
      role="dialog"
      ariaLabel={ariaLabel}
      className={`rounded-card border border-line bg-surface p-3 shadow-lg ${className}`}
      style={{ width }}
    >
      {children}
    </FloatingPanel>
  );
}
