import type { ButtonHTMLAttributes } from "react";
import {
  CallIcon,
  CheckInIcon,
  DeleteIcon,
  EditIcon,
  MENU_ICON,
  NoteIcon,
  RemoveIcon,
  SearchIcon,
} from "@/lib/icons";

/** Owner's rule (24 Nov 2569): every "เพิ่ม…" button shows ＋, every search button a magnifier,
 *  every delete button a bin. Use <Button icon="add"> or put <ActionIcon kind="add" /> inside a buttonClass() link. */
export type ActionKind =
  "add" | "search" | "delete" | "call" | "checkin" | "note" | "remove" | "edit";
const ACTION_ICON = {
  add: MENU_ICON.plus,
  search: SearchIcon,
  delete: DeleteIcon,
  call: CallIcon,
  checkin: CheckInIcon,
  note: NoteIcon,
  remove: RemoveIcon,
  edit: EditIcon,
};

export function ActionIcon({ kind }: { kind: ActionKind }) {
  const Icon = ACTION_ICON[kind];
  return <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden />;
}

type Variant = "primary" | "secondary" | "danger" | "ghost";

// Colours and weights from aoocommerce's .btn-{variant} (globals.css), mapped to the theme tokens.
const STYLE: Record<Variant, string> = {
  primary: "bg-brand font-semibold text-brand-ink",
  secondary: "border border-line-strong bg-surface text-ink",
  danger: "bg-danger font-semibold text-danger-ink",
  ghost: "text-ink-soft",
};

/** Hover colours, written out in full so Tailwind finds them. Buttons use `enabled:` so a disabled one stays grey. */
const HOVER: Record<Variant, string> = {
  primary: "hover:bg-brand-hover",
  secondary: "hover:bg-bg",
  danger: "hover:opacity-90",
  ghost: "hover:bg-sidebar-hover hover:text-ink",
};
const ENABLED_HOVER: Record<Variant, string> = {
  primary: "enabled:hover:bg-brand-hover",
  secondary: "enabled:hover:bg-bg",
  danger: "enabled:hover:opacity-90",
  ghost: "enabled:hover:bg-sidebar-hover enabled:hover:text-ink",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  full?: boolean;
  icon?: ActionKind;
};

/** Every button is at least 44px high. A disabled button turns grey. */
export function Button({
  variant = "primary",
  full,
  className = "",
  type = "button",
  icon,
  children,
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 font-medium transition-colors
        disabled:cursor-not-allowed disabled:border-transparent disabled:bg-line disabled:text-ink-soft
        ${STYLE[variant]} ${ENABLED_HOVER[variant]} ${full ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {icon && <ActionIcon kind={icon} />}
      {children}
    </button>
  );
}

/** Classes for a link that should look like a button. */
export const buttonClass = (variant: Variant = "primary", full = false) =>
  `inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 font-medium transition-colors ${STYLE[variant]} ${HOVER[variant]} ${full ? "w-full" : ""}`;
