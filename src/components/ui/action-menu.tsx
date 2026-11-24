"use client";

/**
 * <ActionMenu> — the ⋯ button of a row with its secondary actions
 * (ported from aoocommerce ActionMenu.tsx). Use it when a row has 2+ secondary actions;
 * a single action stays a plain button.
 *
 * Drawn through FloatingPanel (portal, above open modals, flips, stays inside the screen).
 * A click inside does not reach a clickable row behind it.
 *
 * <ActionMenu label="ตัวเลือกของ สมชาย" items={[
 *   { key: "edit", label: "แก้ไข", icon: <EditIcon />, onClick: edit },
 *   { key: "del", label: "ลบ", icon: <DeleteIcon />, onClick: del, danger: true, dividerBefore: true },
 * ]} />
 */
import { useRef, useState, type ReactNode } from "react";
import { MoreIcon } from "@/lib/icons";
import { FloatingPanel } from "./floating-panel";
import { Tooltip } from "./tooltip";

export interface ActionItem {
  key: string;
  label: ReactNode;
  description?: string;
  icon?: ReactNode;
  onClick?: () => void;
  /** Link instead of a button */
  href?: string;
  /** The main action of this menu: brand colour, bold. At most one. */
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  dividerBefore?: boolean;
}

export function ActionMenu({
  items,
  label = "ตัวเลือกเพิ่มเติม",
  trigger,
  triggerClassName,
  placement = "bottom",
  align = "end",
}: {
  items: ActionItem[];
  /** Thai name of the ⋯ button (aria-label + tooltip). */
  label?: string;
  /** Custom trigger content instead of ⋯ */
  trigger?: ReactNode;
  triggerClassName?: string;
  placement?: "top" | "bottom";
  /** "start" when the button sits at the left edge. */
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  if (items.length === 0) return null;

  const itemClass = (it: ActionItem) =>
    `flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left text-base whitespace-nowrap transition-colors [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0 ${
      it.disabled
        ? "cursor-not-allowed text-ink-soft opacity-60"
        : it.danger
          ? "text-danger hover:bg-danger-soft"
          : it.primary
            ? "font-semibold text-brand hover:bg-brand-soft"
            : "text-ink hover:bg-sidebar-hover"
    }`;

  return (
    <>
      <Tooltip text={trigger ? "" : label}>
        <button
          ref={ref}
          type="button"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setOpen((o) => !o);
          }}
          className={
            triggerClassName ??
            "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-soft transition-colors hover:bg-sidebar-hover hover:text-ink"
          }
        >
          {trigger ?? <MoreIcon className="h-5 w-5" aria-hidden />}
        </button>
      </Tooltip>
      <FloatingPanel
        open={open}
        anchorRef={ref}
        onDismiss={() => setOpen(false)}
        placement={placement}
        align={align}
        role="menu"
        className="w-max min-w-44 rounded-control border border-line bg-surface py-1 shadow-lg"
      >
        {items.map((it, i) => {
          const body = (
            <>
              {it.icon}
              <span className="flex flex-1 flex-col">
                <span>{it.label}</span>
                {it.description && (
                  <span className="max-w-64 text-xs leading-snug font-normal whitespace-normal text-ink-soft">
                    {it.description}
                  </span>
                )}
              </span>
            </>
          );
          return (
            <div key={it.key}>
              {i > 0 && it.dividerBefore && <div className="my-1 border-t border-line" />}
              {it.href && !it.disabled ? (
                <a role="menuitem" href={it.href} className={itemClass(it)} onClick={() => setOpen(false)}>
                  {body}
                </a>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  aria-disabled={it.disabled || undefined}
                  className={itemClass(it)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (it.disabled) return;
                    setOpen(false);
                    it.onClick?.();
                  }}
                >
                  {body}
                </button>
              )}
            </div>
          );
        })}
      </FloatingPanel>
    </>
  );
}
