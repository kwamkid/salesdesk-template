"use client";

/**
 * <ChipsInput> — type words and turn them into chips (ported from aoocommerce ChipsInput.tsx;
 * TagInput's pick-from-list behaviour comes in through `suggestions`, local only, no API).
 *
 *  - Enter or comma adds the text as a chip · × removes one · Backspace on an empty box removes the last.
 *  - Duplicates (ignoring case) are skipped. `max` limits the count.
 *  - `suggestions`: a list under the box while typing (FloatingPanel); tap one to add it.
 *  - `name` sends one hidden field per chip (formData.getAll(name)).
 *
 * <ChipsInput name="tags" defaultValue={["บ้านเดี่ยว"]} suggestions={["ทาวน์โฮม", "บ้านแฝด"]} />
 */
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { CloseIcon } from "@/lib/icons";
import { FloatingPanel } from "./floating-panel";

export function ChipsInput({
  value: valueProp,
  defaultValue = [],
  onChange,
  name,
  placeholder = "พิมพ์แล้วกด Enter",
  suggestions,
  max,
  maxLength = 50,
  disabled,
  "aria-label": ariaLabel = "เพิ่มรายการ",
  className = "",
}: {
  value?: string[];
  defaultValue?: string[];
  onChange?: (chips: string[]) => void;
  name?: string;
  placeholder?: string;
  /** Choices shown while typing (TagInput behaviour) */
  suggestions?: string[];
  /** Most chips allowed */
  max?: number;
  /** Longest chip text */
  maxLength?: number;
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
}) {
  const [inner, setInner] = useState<string[]>(defaultValue);
  const chips = valueProp ?? inner;
  const [text, setText] = useState("");
  const [highlight, setHighlight] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const set = (next: string[]) => {
    if (valueProp === undefined) setInner(next);
    onChange?.(next);
  };
  const full = max !== undefined && chips.length >= max;
  const has = (t: string) => chips.some((c) => c.toLowerCase() === t.toLowerCase());

  const add = (raw: string) => {
    const t = raw.trim().slice(0, maxLength);
    setText("");
    setHighlight(-1);
    if (!t || has(t) || full) return;
    set([...chips, t]);
  };
  const remove = (i: number) => set(chips.filter((_, j) => j !== i));

  const q = text.trim().toLowerCase();
  const matches = suggestions && q ? suggestions.filter((s) => s.toLowerCase().includes(q) && !has(s)).slice(0, 8) : [];
  const open = matches.length > 0 && !full;

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (open && e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, matches.length - 1));
    } else if (open && e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" || e.key === ",") {
      if (!text.trim() && e.key === "Enter") return; // let an empty Enter submit the form
      e.preventDefault();
      add(open && highlight >= 0 ? matches[highlight] : text);
    } else if (e.key === "Backspace" && !text && chips.length > 0) {
      remove(chips.length - 1);
    } else if (e.key === "Escape" && text) {
      e.preventDefault();
      setText("");
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {name !== undefined && chips.map((c) => <input key={c} type="hidden" name={name} value={c} />)}
      <div
        ref={boxRef}
        onClick={() => inputRef.current?.focus()}
        className={`flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-control border px-2 py-1.5 ${
          disabled ? "border-line bg-bg" : "border-line bg-surface focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20"
        }`}
      >
        {chips.map((c, i) => (
          <span
            key={c}
            className="inline-flex max-w-full items-center gap-1 rounded-control border border-line bg-bg py-0.5 pr-0.5 pl-2 text-sm font-medium"
          >
            <span className="max-w-48 truncate">{c}</span>
            <button
              type="button"
              disabled={disabled}
              aria-label={`เอา ${c} ออก`}
              onClick={(e) => {
                e.stopPropagation();
                remove(i);
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-control text-ink-soft hover:bg-sidebar-hover hover:text-ink"
            >
              <CloseIcon className="h-3.5 w-3.5" aria-hidden />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={text}
          disabled={disabled || full}
          maxLength={maxLength}
          placeholder={full ? `ครบ ${max} รายการแล้ว` : chips.length ? "" : placeholder}
          aria-label={ariaLabel}
          role={suggestions ? "combobox" : undefined}
          aria-autocomplete={suggestions ? "list" : undefined}
          aria-expanded={suggestions ? open : undefined}
          aria-controls={open ? listId : undefined}
          onChange={(e) => {
            const v = e.target.value;
            if (v.includes(",")) {
              // Pasted "a, b, c": add every finished part at once, keep the last part typing.
              const parts = v.split(",");
              const next = [...chips];
              for (const raw of parts.slice(0, -1)) {
                const t = raw.trim().slice(0, maxLength);
                if (t && !next.some((c) => c.toLowerCase() === t.toLowerCase()) && (max === undefined || next.length < max)) next.push(t);
              }
              if (next.length !== chips.length) set(next);
              setText(parts[parts.length - 1]);
            } else {
              setText(v);
              setHighlight(-1);
            }
          }}
          onKeyDown={onKey}
          onBlur={() => text.trim() && !open && add(text)}
          className="min-h-8 min-w-24 flex-1 bg-transparent px-1 text-base text-ink outline-none placeholder:text-ink-soft"
        />
      </div>
      <FloatingPanel
        open={open}
        anchorRef={boxRef}
        onDismiss={() => setHighlight(-1)}
        matchWidth="min"
        stopPropagation={false}
        className="overflow-hidden rounded-control border border-line bg-surface shadow-lg"
      >
        <div id={listId} role="listbox" aria-label="ตัวเลือก" className="max-h-64 overflow-y-auto py-1">
          {matches.map((m, i) => (
            <button
              key={m}
              type="button"
              role="option"
              aria-selected={i === highlight}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(m)}
              className={`flex min-h-11 w-full items-center px-4 text-left text-base hover:bg-sidebar-hover ${i === highlight ? "bg-sidebar-hover" : ""}`}
            >
              {m}
            </button>
          ))}
        </div>
      </FloatingPanel>
    </div>
  );
}
