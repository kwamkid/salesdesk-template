"use client";

/**
 * <HelpHint> — an ⓘ next to a field or a term; a tap shows a short explanation
 * (ported from aoocommerce HelpHint.tsx). Tap, not hover, so it works on phones.
 *
 *   Tooltip  = name of an icon button (hover / long press)
 *   HelpHint = "what does this mean / how do I fill it" (tap to open, tap again or outside to close)
 *
 * Keep it OUTSIDE a <Field> label when possible: a tap on a label focuses its input.
 * Inside a label it still works (the tap is stopped), it just sits next to the label text.
 *
 * <span>ลีดคุณภาพ<HelpHint>ลูกค้ามีงบและสนใจจริง</HelpHint></span>
 */
import { useId, useRef, useState, type ReactNode } from "react";
import { HelpIcon } from "@/lib/icons";
import { FloatingPanel } from "./floating-panel";

export function HelpHint({
  children,
  align = "start",
  ariaLabel = "คำอธิบายเพิ่มเติม",
  leading,
  wide,
}: {
  /** A function gets `close()` to shut the box itself. */
  children: ReactNode | ((close: () => void) => ReactNode);
  /** "end" when the icon sits near the right edge of the screen. */
  align?: "start" | "end";
  ariaLabel?: string;
  /** Icon before the text: no left gap. */
  leading?: boolean;
  /** Wider box (up to 560px). */
  wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const id = useId();

  return (
    <span ref={wrapRef} className={`relative inline-flex align-middle ${leading ? "" : "ml-1"}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={id}
        onClick={(e) => {
          // Inside a <label> or a clickable row: do not focus the input / open the row.
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        // 44px tap area around a 16px icon without moving the text around it.
        className={`relative inline-flex h-5 w-5 items-center justify-center rounded-full transition-colors
          before:absolute before:-inset-3 before:content-[''] ${open ? "text-brand" : "text-ink-soft hover:text-brand"}`}
      >
        <HelpIcon className="h-4 w-4" strokeWidth={2} aria-hidden />
      </button>
      <FloatingPanel
        open={open}
        anchorRef={wrapRef}
        onDismiss={() => setOpen(false)}
        align={align}
        gap={6}
        role="note"
        id={id}
        className={`w-max rounded-control bg-tooltip px-3 py-2 text-left text-sm leading-relaxed font-normal text-tooltip-ink shadow-lg ${
          wide ? "max-w-[min(560px,92vw)]" : "max-w-[min(280px,80vw)]"
        }`}
      >
        {typeof children === "function" ? children(() => setOpen(false)) : children}
      </FloatingPanel>
    </span>
  );
}
