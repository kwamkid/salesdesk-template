import type { ButtonHTMLAttributes } from "react";

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

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; full?: boolean };

/** Every button is at least 44px high. A disabled button turns grey. */
export function Button({ variant = "primary", full, className = "", type = "button", ...rest }: Props) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 font-medium transition-colors
        disabled:cursor-not-allowed disabled:border-transparent disabled:bg-line disabled:text-ink-soft
        ${STYLE[variant]} ${ENABLED_HOVER[variant]} ${full ? "w-full" : ""} ${className}`}
      {...rest}
    />
  );
}

/** Classes for a link that should look like a button. */
export const buttonClass = (variant: Variant = "primary", full = false) =>
  `inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 font-medium transition-colors ${STYLE[variant]} ${HOVER[variant]} ${full ? "w-full" : ""}`;
