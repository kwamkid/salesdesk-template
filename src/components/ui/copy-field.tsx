"use client";

/**
 * <CopyField> — read-only text (a link, a key) with a copy button (aoocommerce CopyField.tsx).
 * Tapping the field selects all, in case the browser blocks the clipboard.
 */
import { useState } from "react";
import { CheckIcon, CopyIcon } from "@/lib/icons";
import { Tooltip } from "./tooltip";

export function CopyField({
  value,
  label,
  hint,
  iconOnly = false,
  multiline = false,
}: {
  value: string;
  label?: string;
  hint?: string;
  iconOnly?: boolean;
  multiline?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the field is selectable by hand.
    }
  };
  const field = "min-w-0 flex-1 rounded-control border border-line bg-bg px-3 text-ink";
  const text = copied ? "คัดลอกแล้ว" : "คัดลอก";
  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-sm font-medium">{label}</span>}
      <div className={`flex gap-2 ${multiline ? "items-start" : "items-stretch"}`}>
        {multiline ? (
          <textarea
            value={value}
            readOnly
            rows={Math.min(8, Math.max(3, value.split("\n").length))}
            onFocus={(e) => e.currentTarget.select()}
            aria-label={label}
            className={`${field} resize-none py-2 text-sm`}
          />
        ) : (
          <input
            type="text"
            value={value}
            readOnly
            onFocus={(e) => e.currentTarget.select()}
            aria-label={label}
            className={`${field} min-h-11 font-mono text-sm`}
          />
        )}
        <Tooltip text={iconOnly ? text : ""}>
          <button
            type="button"
            onClick={copy}
            aria-label={text}
            aria-live="polite"
            className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-control border px-3 text-sm font-medium transition-colors ${
              iconOnly ? "w-11 justify-center px-0" : ""
            } ${copied ? "border-ok text-ok" : "border-line-strong bg-surface text-ink hover:bg-bg"}`}
          >
            {copied ? <CheckIcon className="h-4 w-4" strokeWidth={2.5} aria-hidden /> : <CopyIcon className="h-4 w-4" aria-hidden />}
            {!iconOnly && text}
          </button>
        </Tooltip>
      </div>
      {hint && <p className="text-sm text-ink-soft">{hint}</p>}
    </div>
  );
}
