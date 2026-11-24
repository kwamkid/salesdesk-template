"use client";

import { ActionIcon, type ActionKind } from "./button";
import { Tooltip } from "./tooltip";

const TONE = {
  neutral: "text-ink-soft hover:bg-bg hover:text-ink",
  brand: "text-brand hover:bg-brand-soft",
  danger: "text-danger hover:bg-danger-soft",
} as const;

/** <IconButton> — an icon-only button (44px, coloured by tone, Thai tooltip + aria-label).
 *  The one way to make a small row action such as remove / edit instead of a text button. */
export function IconButton({
  kind,
  label,
  tone = "neutral",
  disabled,
  onClick,
}: {
  kind: ActionKind;
  /** Thai: shown as the tooltip and read by screen readers. */
  label: string;
  tone?: keyof typeof TONE;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip text={label}>
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-control transition-colors disabled:opacity-50 ${TONE[tone]}`}
      >
        <ActionIcon kind={kind} />
      </button>
    </Tooltip>
  );
}
