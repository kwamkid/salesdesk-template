"use client";

/**
 * <FileDropzone> — attach one file by drag & drop or by tapping (aoo-techstack/ui/DROPZONE.md,
 * template file-dropzone.tsx). Never show a bare <input type="file">.
 *
 *  - Inside sits a real <input type="file" name=…>: a dropped file is put into it, so a form /
 *    server action reading formData.get(name) works unchanged.
 *  - Dropping is NOT uploading: the file stays in the browser until the form is sent.
 *  - Picture preview from the local file (no network), name, size and a × to remove it.
 *  - `accept` and `maxSizeMB` are checked on drop and on pick, with a Thai error.
 *  - `capture="environment"` opens the back camera on phones (visit photos).
 *  - `onFile(file | null)` for screens that read the file themselves (JSON pins, Excel units).
 *
 * <FileDropzone name="cover" accept="image/*" maxSizeMB={10} prompt="ลากรูปมาวาง หรือแตะเพื่อเลือก" />
 */
import { useEffect, useId, useRef, useState, type DragEvent, type ReactNode } from "react";
import { CloseIcon, FileIcon, UploadIcon } from "@/lib/icons";

export interface FileDropzoneProps {
  name?: string;
  /** Same as <input accept>, e.g. "image/*" or ".xlsx,.csv" */
  accept?: string;
  maxSizeMB?: number;
  prompt?: string;
  /** Small line under the prompt, e.g. "JPG หรือ PNG ไม่เกิน 10 MB" */
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  /** "environment" = back camera on phones */
  capture?: "environment" | "user";
  onFile?: (file: File | null) => void;
  /** Picture already saved (shown until a new file is chosen) */
  currentUrl?: string | null;
  currentLabel?: string;
  /** Replace the default preview row (e.g. a bigger picture) */
  renderPreview?: (file: File, previewUrl: string | null) => ReactNode;
  /** Thai name for screen readers */
  "aria-label"?: string;
  className?: string;
}

function accepts(file: File, accept?: string): boolean {
  if (!accept) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return accept
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean)
    .some((a) => (a.startsWith(".") ? name.endsWith(a) : a.endsWith("/*") ? type.startsWith(a.slice(0, -1)) : type === a));
}

const sizeText = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toLocaleString("th-TH", { maximumFractionDigits: 1 })} MB`
    : `${Math.max(1, Math.round(bytes / 1024)).toLocaleString("th-TH")} KB`;

export function FileDropzone({
  name,
  accept,
  maxSizeMB,
  prompt = "ลากไฟล์มาวาง หรือแตะเพื่อเลือก",
  hint,
  required,
  disabled,
  capture,
  onFile,
  currentUrl,
  currentLabel = "รูปปัจจุบัน",
  renderPreview,
  "aria-label": ariaLabel,
  className = "",
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const errId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- object URL follows the file
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const check = (f: File): string => {
    if (!accepts(f, accept)) return "ไฟล์นี้ใช้ไม่ได้ เลือกไฟล์ตามชนิดที่บอกไว้";
    if (maxSizeMB && f.size > maxSizeMB * 1024 * 1024) return `ไฟล์ใหญ่เกิน ${maxSizeMB} MB`;
    return "";
  };

  /** Put the file into the real input (FormData sees it) and tell the caller. */
  const use = (f: File | null, fromInput = false) => {
    const input = inputRef.current;
    if (f) {
      const err = check(f);
      if (err) {
        setError(err);
        if (input) input.value = "";
        return;
      }
      if (input && !fromInput) {
        const dt = new DataTransfer();
        dt.items.add(f);
        input.files = dt.files;
      }
    } else if (input) {
      input.value = "";
    }
    setError("");
    setFile(f);
    onFile?.(f);
  };

  const isFileDrag = (e: DragEvent) => e.dataTransfer.types.includes("Files");
  const open = () => !disabled && inputRef.current?.click();

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        capture={capture}
        required={required && !file}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        onChange={(e) => use(e.target.files?.[0] ?? null, true)}
      />

      {file ? (
        renderPreview ? (
          <div className="flex flex-col gap-2">
            {renderPreview(file, preview)}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={open} disabled={disabled} className="min-h-11 rounded-control border border-line-strong bg-surface px-3 text-sm font-medium hover:bg-bg">
                เลือกไฟล์อื่น
              </button>
              <button type="button" onClick={() => use(null)} disabled={disabled} className="min-h-11 rounded-control px-3 text-sm font-medium text-ink-soft hover:bg-sidebar-hover hover:text-ink">
                เอาไฟล์ออก
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-control border border-line bg-bg p-2.5">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL
              <img src={preview} alt="" className="h-14 w-14 shrink-0 rounded-control border border-line object-cover" />
            ) : (
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-control bg-surface text-ink-soft">
                <FileIcon className="h-6 w-6" aria-hidden />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{file.name}</p>
              <p className="text-sm text-ink-soft">{sizeText(file.size)}</p>
            </div>
            <button
              type="button"
              onClick={() => use(null)}
              disabled={disabled}
              aria-label="เอาไฟล์ออก"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-soft hover:bg-surface hover:text-ink"
            >
              <CloseIcon className="h-5 w-5" aria-hidden />
            </button>
          </div>
        )
      ) : (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled || undefined}
          aria-label={ariaLabel ?? prompt}
          aria-describedby={error ? errId : undefined}
          onClick={open}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              open();
            }
          }}
          onDragOver={(e) => {
            if (!isFileDrag(e) || disabled) return;
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            if (e.currentTarget === e.target) setDragging(false);
          }}
          onDrop={(e) => {
            if (!isFileDrag(e) || disabled) return;
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) use(f);
          }}
          className={`flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-card border-2 border-dashed px-4 py-5 text-center transition-colors ${
            dragging ? "border-brand bg-brand-soft" : error ? "border-danger bg-danger-soft/40" : "border-line-strong bg-bg hover:border-brand"
          } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
        >
          {currentUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- saved Storage URL
            <img src={currentUrl} alt={currentLabel} className="mb-1 max-h-28 rounded-control border border-line object-contain" />
          ) : (
            <UploadIcon className={`h-6 w-6 ${dragging ? "text-brand" : "text-ink-soft"}`} aria-hidden />
          )}
          <span className="text-base text-ink">{currentUrl ? `${prompt} (แทน${currentLabel})` : prompt}</span>
          {hint && <span className="text-sm text-ink-soft">{hint}</span>}
        </div>
      )}
      {error && (
        <p id={errId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
