"use client";

/**
 * <FormSelect> — the one dropdown of the app (ported from aoocommerce FormSelect.tsx).
 * aoo rule: never a native <select>. A list longer than 7 gets a search box.
 *
 *  - Controlled (`value` + `onChange(value)`) or uncontrolled (`defaultValue`).
 *  - `name` adds a form field, so plain <form action={serverAction}> and GET filter forms work
 *    unchanged. `required` is checked by the browser like a normal field. `form` links it to a
 *    form elsewhere on the page.
 *  - The list is drawn through FloatingPanel: portal on <body>, above open modals, flips up/down,
 *    bottom sheet on phones for long lists.
 *
 * <FormSelect name="project" defaultValue="" clearLabel="ทุกโครงการ" options={[{ id, label }]} />
 *
 * `Select` (also exported from field.tsx) takes <option> children like the native element,
 * for code written before FormSelect existed.
 */
import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { CheckIcon, ChevronDownIcon, SearchIcon } from "@/lib/icons";
import { FloatingPanel } from "./floating-panel";

export interface FormSelectOption {
  id: string;
  label: string;
  /** Second line under the label */
  subtitle?: string;
  icon?: ReactNode;
  /** Shown but cannot be picked; put the reason in `subtitle`. */
  disabled?: boolean;
}

/** A list longer than this gets a search box. */
const SEARCH_ABOVE = 7;

export interface FormSelectProps {
  options: FormSelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Form field name (a hidden field carries the value). */
  name?: string;
  /** Id of a <form> elsewhere on the page. */
  form?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  /** An "all / none" choice at the top (e.g. "ทุกโครงการ") that sets `clearValue`. */
  clearLabel?: string;
  clearValue?: string;
  icon?: ReactNode;
  /** Trigger id, so a <label htmlFor> can point at it. */
  id?: string;
  "aria-label"?: string;
  className?: string;
}

export function FormSelect({
  options,
  value: valueProp,
  defaultValue = "",
  onChange,
  name,
  form,
  required,
  disabled,
  placeholder = "เลือก",
  searchPlaceholder = "ค้นหา",
  clearLabel,
  clearValue = "",
  icon,
  id,
  "aria-label": ariaLabel,
  className = "",
}: FormSelectProps) {
  const [inner, setInner] = useState(defaultValue);
  const value = valueProp ?? inner;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlight, setHighlight] = useState(-1);
  const anchorRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.id === value);
  const showSearch = options.length > SEARCH_ABOVE;
  const q = search.trim().toLowerCase();
  const filtered = q
    ? options.filter((o) => `${o.label} ${o.subtitle ?? ""}`.toLowerCase().includes(q))
    : options;
  const items: (FormSelectOption & { isClear?: boolean })[] = [
    ...(clearLabel && !q ? [{ id: clearValue, label: clearLabel, isClear: true }] : []),
    ...filtered,
  ];

  const close = useCallback(() => {
    setOpen(false);
    setSearch("");
    setHighlight(-1);
  }, []);

  const pick = (v: string) => {
    if (valueProp === undefined) setInner(v);
    onChange?.(v);
    close();
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open || !showSearch) return;
    const t = setTimeout(() => searchRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open, showSearch]);

  useEffect(() => {
    if (highlight < 0) return;
    listRef.current?.querySelectorAll("[data-option]")[highlight]?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const it = items[highlight];
      if (it && !it.disabled) pick(it.id);
    }
  };

  const isFilterActive = Boolean(clearLabel) && value !== clearValue;
  const triggerText = selected?.label ?? (clearLabel && value === clearValue ? clearLabel : placeholder);

  return (
    <div ref={anchorRef} className={`relative w-full ${className}`} onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        onClick={() => {
          if (open) close();
          else setOpen(true);
        }}
        className={`flex min-h-11 w-full items-center gap-2 rounded-control border bg-surface px-3 text-left text-base transition-colors
          disabled:cursor-not-allowed disabled:bg-bg disabled:text-ink-soft
          ${open ? "border-brand ring-2 ring-brand/20" : isFilterActive ? "border-ink-soft" : "border-line hover:border-line-strong"}`}
      >
        {icon && <span className="flex shrink-0 items-center text-ink-soft [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
        {selected?.icon && <span className="flex shrink-0 items-center">{selected.icon}</span>}
        <span className={`min-w-0 flex-1 truncate ${selected || (clearLabel && value === clearValue) ? "text-ink" : "text-ink-soft"}`}>
          {triggerText}
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {name !== undefined && (
        // A real (visually hidden) field, after the button so a tap on a wrapping <label> opens the list: the form sends it, and `required` shows the browser's
        // own "please fill" bubble here. Hidden inputs skip validation, so this is a text input.
        <input
          name={name}
          form={form}
          value={value}
          required={required}
          disabled={disabled}
          onChange={() => {}}
          onInvalid={() => triggerRef.current?.focus()}
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-4 h-px w-px opacity-0"
        />
      )}
      <FloatingPanel
        open={open}
        anchorRef={anchorRef}
        onDismiss={close}
        matchWidth="min"
        mobileSheet={options.length > SEARCH_ABOVE}
        stopPropagation={false}
        className="flex max-w-[min(420px,calc(100vw-1rem))] flex-col overflow-hidden rounded-control border border-line bg-surface shadow-lg sm:w-max"
      >
        {showSearch && (
          <div className="shrink-0 border-b border-line p-2">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-soft" aria-hidden />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHighlight(e.target.value ? 0 : -1);
                }}
                onKeyDown={onKeyDown}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="min-h-11 w-full rounded-control border border-line bg-bg pr-3 pl-9 text-base text-ink placeholder:text-ink-soft"
              />
            </div>
          </div>
        )}
        <div ref={listRef} id={listId} role="listbox" className="max-h-72 min-h-0 overflow-y-auto overscroll-contain py-1">
          {items.map((o, i) => {
            const active = o.id === value;
            return (
              <button
                key={o.isClear ? "__clear__" : o.id}
                type="button"
                data-option
                role="option"
                aria-selected={active}
                disabled={o.disabled}
                onClick={() => !o.disabled && pick(o.id)}
                className={`flex min-h-11 w-full items-center gap-2 px-4 py-2 text-left text-base transition-colors hover:bg-sidebar-hover
                  ${i === highlight ? "bg-sidebar-hover" : ""}
                  ${o.disabled ? "cursor-not-allowed text-ink-soft opacity-60 hover:bg-transparent" : active ? "font-medium text-brand" : "text-ink"}`}
              >
                {o.icon && <span className="flex shrink-0 items-center">{o.icon}</span>}
                <span className="min-w-0 flex-1">
                  <span className="block">{o.label}</span>
                  {o.subtitle && <span className="block text-xs text-ink-soft">{o.subtitle}</span>}
                </span>
                {active && <CheckIcon className="h-4 w-4 shrink-0 text-brand" aria-hidden />}
              </button>
            );
          })}
          {items.length === 0 && <p className="px-4 py-4 text-center text-base text-ink-soft">ไม่พบรายการ</p>}
        </div>
      </FloatingPanel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Select: the old native-<select> API on top of FormSelect.
// ---------------------------------------------------------------------------

type OptionProps = { value?: string | number; children?: ReactNode; disabled?: boolean };

function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

function optionsOf(children: ReactNode): FormSelectOption[] {
  const out: FormSelectOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<OptionProps & { label?: string }>;
    if (el.type === "option") {
      const label = textOf(el.props.children);
      out.push({ id: String(el.props.value ?? label), label, disabled: el.props.disabled });
    } else {
      // <optgroup> or a fragment: take the options inside.
      out.push(...optionsOf(el.props.children));
    }
  });
  return out;
}

/** Native-like API: <Select name value|defaultValue onChange={(e) => e.target.value}><option/>…</Select>.
 *  An <option value=""> becomes the "all / choose" entry. Prefer <FormSelect options> in new code. */
export function Select({
  children,
  value,
  defaultValue,
  onChange,
  name,
  form,
  required,
  disabled,
  id,
  className,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (e: { target: { value: string } }) => void;
  name?: string;
  form?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const all = optionsOf(children);
  const blank = all.find((o) => o.id === "");
  const options = all.filter((o) => o.id !== "");
  // Like a native <select>: with no "" option, an unknown default falls back to the first option.
  let initial = defaultValue === undefined ? "" : String(defaultValue);
  if (!blank && !options.some((o) => o.id === initial)) initial = options[0]?.id ?? "";
  return (
    <FormSelect
      options={options}
      value={value === undefined ? undefined : String(value)}
      defaultValue={initial}
      onChange={onChange ? (v) => onChange({ target: { value: v } }) : undefined}
      name={name}
      form={form}
      required={required}
      disabled={disabled}
      id={id}
      className={className}
      aria-label={ariaLabel}
      // A required field shows "เลือก…" as a hint only; an optional one can be set back to it.
      placeholder={blank?.label || "เลือก"}
      clearLabel={blank && !required ? blank.label : undefined}
    />
  );
}
