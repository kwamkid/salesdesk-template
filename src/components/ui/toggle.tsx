"use client";

/**
 * <Toggle> — iOS-style on/off switch (ported from aoocommerce Toggle.tsx), and <ToggleRow>:
 * a settings row with title + hint on the left and the switch on the right.
 *
 *  - Controlled: `checked` + `onChange(v)`. Uncontrolled: `defaultChecked`.
 *  - `name` sends a form field like a checkbox: value "on" (or `value`) only while switched on,
 *    so server actions that read formData.get(name) === "on" keep working.
 *  - The tap area is 44px high; the switch itself is 44×24.
 */
import { useId, useState, type ReactNode } from "react";
import { LoadingIcon } from "@/lib/icons";

export interface ToggleProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (v: boolean) => void;
  name?: string;
  /** Form value while on (default "on", like a checkbox). */
  value?: string;
  disabled?: boolean;
  /** Spinner in the knob + not pressable (while saving). */
  loading?: boolean;
  id?: string;
  /** Thai name for screen readers when there is no visible label. */
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
}

export function Toggle({
  checked: checkedProp,
  defaultChecked = false,
  onChange,
  name,
  value = "on",
  disabled,
  loading,
  id,
  ...aria
}: ToggleProps) {
  const [inner, setInner] = useState(defaultChecked);
  const checked = checkedProp ?? inner;
  const interactive = !disabled && !loading;
  return (
    <>
      {name && checked && <input type="hidden" name={name} value={value} />}
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        aria-busy={loading || undefined}
        disabled={!interactive}
        onClick={() => {
          if (!interactive) return;
          if (checkedProp === undefined) setInner(!checked);
          onChange?.(!checked);
        }}
        // 44px tall tap area around the 24px track
        className={`relative inline-flex h-11 w-11 shrink-0 items-center ${loading ? "cursor-wait" : disabled ? "cursor-not-allowed opacity-50" : ""}`}
        {...aria}
      >
        <span
          aria-hidden
          className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-brand" : "bg-line-strong"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-surface shadow transition-transform ${
              checked ? "translate-x-5" : "translate-x-0"
            }`}
          >
            {loading && <LoadingIcon className="h-3 w-3 animate-spin text-ink-soft" />}
          </span>
        </span>
      </button>
    </>
  );
}

/** Settings row: title (+ hint) on the left, Toggle on the right. The whole text is the label. */
export function ToggleRow({
  title,
  hint,
  ...toggle
}: ToggleProps & { title: ReactNode; hint?: ReactNode }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-3">
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer py-2.5">
        <span id={`${id}-t`} className="block font-medium">
          {title}
        </span>
        {hint && (
          <span id={`${id}-h`} className="mt-0.5 block text-sm text-ink-soft">
            {hint}
          </span>
        )}
      </label>
      <Toggle id={id} aria-labelledby={`${id}-t`} aria-describedby={hint ? `${id}-h` : undefined} {...toggle} />
    </div>
  );
}
