import type { ComponentProps, ReactNode } from "react";

const CONTROL =
  "min-h-11 w-full rounded-control border border-line bg-surface px-3 text-base text-ink placeholder:text-ink-soft disabled:bg-bg";

/** Label + control + optional hint or error. Use it for every form field.
 *  It renders a <label>, so keep buttons (e.g. date shortcuts) outside it: a tap on the label presses them. */
export function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      {children}
      {error ? (
        <span className="text-sm text-danger">{error}</span>
      ) : (
        hint && <span className="text-sm text-ink-soft">{hint}</span>
      )}
    </label>
  );
}

export function Input({ className = "", ...rest }: ComponentProps<"input">) {
  return <input className={`${CONTROL} ${className}`} {...rest} />;
}

/** Dropdown with the native <option> API, drawn by FormSelect (no native <select> in the app). */
export { Select } from "./form-select";

export function Textarea({ className = "", rows = 3, ...rest }: ComponentProps<"textarea">) {
  return <textarea rows={rows} className={`${CONTROL} py-2 ${className}`} {...rest} />;
}
