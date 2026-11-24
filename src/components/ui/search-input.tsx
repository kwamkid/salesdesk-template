"use client";

/**
 * <SearchInput> — search box with a magnifier and a clear button (ported from aoocommerce SearchInput.tsx).
 *
 *  - Controlled (`value` + `onChange`) or uncontrolled with `name` + `defaultValue`, so a plain
 *    GET filter form (<form> with name="q") keeps working; Enter submits that form.
 *  - Esc or the × clears it. Clearing an uncontrolled box inside a form submits the form
 *    when `submitOnClear` is set (the list shows everything again).
 */
import { useRef, useState } from "react";
import { CloseIcon, SearchIcon } from "@/lib/icons";

export function SearchInput({
  value: valueProp,
  defaultValue = "",
  onChange,
  onSubmit,
  name,
  placeholder = "ค้นหา",
  autoFocus,
  disabled,
  submitOnClear,
  "aria-label": ariaLabel,
  className = "",
}: {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Enter key (a form around it submits by itself). */
  onSubmit?: () => void;
  name?: string;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  submitOnClear?: boolean;
  "aria-label"?: string;
  className?: string;
}) {
  const [inner, setInner] = useState(defaultValue);
  const value = valueProp ?? inner;
  const ref = useRef<HTMLInputElement>(null);
  const set = (v: string) => {
    if (valueProp === undefined) setInner(v);
    onChange?.(v);
  };
  const clear = () => {
    set("");
    ref.current?.focus();
    if (submitOnClear && valueProp === undefined) {
      // Let React write "" into the field before the form reads it.
      requestAnimationFrame(() => ref.current?.form?.requestSubmit());
    }
  };
  return (
    <div className={`relative w-full ${className}`}>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-soft" aria-hidden />
      <input
        ref={ref}
        type="search"
        name={name}
        value={value}
        onChange={(e) => set(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.preventDefault();
            clear();
          }
          if (e.key === "Enter" && onSubmit) {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        className="min-h-11 w-full rounded-control border border-line bg-surface pr-11 pl-9 text-base text-ink placeholder:text-ink-soft disabled:bg-bg [&::-webkit-search-cancel-button]:hidden"
      />
      {value && !disabled && (
        <button
          type="button"
          onClick={clear}
          aria-label="ล้างคำค้น"
          className="absolute top-1/2 right-0 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center text-ink-soft hover:text-ink"
        >
          <CloseIcon className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
