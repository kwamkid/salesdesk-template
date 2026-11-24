"use client";

/**
 * <Modal> — the one dialog box of the app (ported from aoocommerce components/ui/Modal.tsx,
 * pattern: aoo-techstack/ui/MODAL.md). Sheet and ConfirmCard are built on it.
 *
 *  - Rendered in a portal on <body>, so a card that clips overflow or a <form> around it
 *    cannot cut it or catch its Enter key.
 *  - Sizes sm…4xl (default 2xl). Taller than the screen: the body scrolls, header and footer stay.
 *  - `mobileSheet`: below 768px it becomes a bottom sheet (full width, rounded top).
 *  - Esc closes the top-most modal only. A tap on the dim backdrop closes it, but only when the
 *    press STARTED on the backdrop: selecting text inside and releasing outside does not close it.
 *  - Focus moves into the box on open (or to a [data-autofocus] field), Tab stays inside, focus returns to the opener on close.
 *  - Page scroll is locked while open.
 *
 * <Modal open={open} onClose={close} title="แก้ไข" footer={<Buttons/>}>...</Modal>
 */
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/lib/icons";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: "md:max-w-sm",
  md: "md:max-w-md",
  lg: "md:max-w-lg",
  xl: "md:max-w-xl",
  "2xl": "md:max-w-2xl",
  "3xl": "md:max-w-3xl",
  "4xl": "md:max-w-4xl",
};

/** Same sizes for the centred (non-sheet) box on phones too. */
const SIZE_CLASS_ALL: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
};

/** Above the app shell; floating panels (FLOATING_Z 9999) still open above it. */
export const MODAL_Z = 1000;

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /** Icon left of the title */
  icon?: ReactNode;
  /** Width from 768px. Default "2xl". */
  size?: ModalSize;
  /** Button row pinned to the bottom of the box */
  footer?: ReactNode;
  /** Hide the X button (a confirm box that must be answered) */
  hideCloseButton?: boolean;
  /** A tap on the backdrop does nothing (forms that must not close by accident) */
  disableBackdropClose?: boolean;
  /** Body padding. false for content that reaches the edges (lists, tables, pictures). */
  bodyPadding?: boolean;
  /** Bottom sheet below 768px instead of a centred box. */
  mobileSheet?: boolean;
  /** Screen-reader name when `title` is not plain text. */
  ariaLabel?: string;
  children: ReactNode;
}

// Open modals, oldest first: only the last one reacts to Esc.
const stack: string[] = [];

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  title,
  icon,
  size = "2xl",
  footer,
  hideCloseButton = false,
  disableBackdropClose = false,
  bodyPadding = true,
  mobileSheet = false,
  ariaLabel,
  children,
}: ModalProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Stack, Esc, scroll lock, focus in / Tab trap / focus back.
  useEffect(() => {
    if (!open) return;
    stack.push(id);
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel || panel.contains(document.activeElement)) return;
      // The box itself, not the first field: on phones a focused field pops the keyboard up.
      // Mark a field with data-autofocus to start there instead.
      (panel.querySelector<HTMLElement>("[data-autofocus]") ?? panel).focus({ preventScroll: true });
    });

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      // A floating panel inside (date picker, dropdown) handled Esc first and prevented it.
      if (e.key === "Escape" && !e.defaultPrevented) {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      // Focus inside a floating panel (portalled outside the box) is left alone.
      if (active && !panel.contains(active) && active !== document.body) return;
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      const i = stack.lastIndexOf(id);
      if (i >= 0) stack.splice(i, 1);
      if (stack.length === 0) document.body.style.overflow = prevOverflow;
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [open, id]);

  // Close only when the press STARTED on the backdrop (see aoo-techstack/ui/MODAL.md).
  const pressedOnOverlay = useRef(false);
  const onOverlayPointerDown = (e: React.PointerEvent) => {
    pressedOnOverlay.current = !disableBackdropClose && e.target === e.currentTarget;
  };
  const onOverlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disableBackdropClose) return;
    if (e.target === e.currentTarget && pressedOnOverlay.current) onClose();
    pressedOnOverlay.current = false;
  };

  if (!open || typeof document === "undefined") return null;

  const hasHeader = Boolean(title) || !hideCloseButton;
  const shape = mobileSheet
    ? `mt-auto max-w-none rounded-t-card md:mt-0 md:rounded-card ${SIZE_CLASS[size]}`
    : `rounded-card ${SIZE_CLASS_ALL[size]}`;
  const rootPad = mobileSheet ? "p-0 md:p-4" : "p-4";

  return createPortal(
    <div
      data-modal-root=""
      className={`fixed inset-0 flex items-center justify-center ${rootPad}`}
      style={{ zIndex: MODAL_Z }}
      onPointerDown={onOverlayPointerDown}
      onClick={onOverlayClick}
    >
      <div className="pointer-events-none fixed inset-0 bg-black/50" aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title && !ariaLabel ? titleId : undefined}
        aria-label={ariaLabel}
        tabIndex={-1}
        data-modal-panel=""
        className={`relative flex w-full flex-col bg-surface text-ink shadow-xl outline-none ${shape}`}
        style={{
          maxHeight: mobileSheet
            ? "min(92dvh, calc(100dvh - env(safe-area-inset-top, 0px)))"
            : "calc(100dvh - 2rem)",
        }}
      >
        {mobileSheet && (
          <div className="flex justify-center pt-2 md:hidden" aria-hidden>
            <span className="h-1 w-10 rounded-full bg-line-strong" />
          </div>
        )}
        {hasHeader && (
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-2">
              {icon && <span className="flex shrink-0 text-brand [&>svg]:h-5 [&>svg]:w-5">{icon}</span>}
              {title && (
                <h2 id={titleId} className="truncate text-lg font-semibold">
                  {title}
                </h2>
              )}
            </div>
            {!hideCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="ปิด"
                className="-mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-soft transition-colors hover:bg-sidebar-hover hover:text-ink"
              >
                <CloseIcon className="h-5 w-5" aria-hidden />
              </button>
            )}
          </div>
        )}

        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${bodyPadding ? "px-4 py-4 sm:px-5" : ""}`}
        >
          {children}
        </div>

        {footer && (
          <div
            className="border-t border-line px-4 py-3 sm:px-5"
            style={mobileSheet ? { paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" } : undefined}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Right-aligned button row for `<Modal footer>` (ยกเลิก → ยืนยัน). Wraps to full-width buttons on phones. */
export function ModalFooter({ children }: { children: ReactNode }) {
  return <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{children}</div>;
}
