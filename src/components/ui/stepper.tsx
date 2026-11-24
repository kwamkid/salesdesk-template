"use client";

/**
 * Steps (ported from aoocommerce components/ui/Stepper.tsx + SetupSteps.tsx, Thai only).
 *
 * <Stepper> — progress bar of a flow: a dot per step (icon, or its number), label under it
 *   (vertical: beside it). done = solid dot with a tick · current = outlined brand dot, bold label ·
 *   todo = grey. State is also in the text for screen readers ("เสร็จแล้ว" / "ขั้นปัจจุบัน"),
 *   never colour alone.
 *
 * <SetupSteps> + <SetupStep> — a numbered checklist of panels (the /setup page): number or tick,
 *   title, a "ผ่าน / ยังไม่ผ่าน" badge, body, optional copy fields and screenshots.
 */
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { CheckIcon } from "@/lib/icons";
import { Badge } from "./card";
import { CopyField } from "./copy-field";
import { ImageLightbox } from "./image-lightbox";

export type StepState = "done" | "current" | "todo";

export interface StepItem {
  key: string;
  label: string;
  /** Second line under the label (usually only on the current step) */
  note?: string;
  state: StepState;
  /** Go back to a done step */
  href?: string;
  /** Icon in the dot; without it the dot shows the step number */
  icon?: ReactNode;
}

const STATE_TEXT: Record<StepState, string> = { done: "เสร็จแล้ว", current: "ขั้นปัจจุบัน", todo: "ยังไม่ถึง" };

export function Stepper({
  steps,
  ariaLabel = "ขั้นตอน",
  orientation = "horizontal",
  onSelect,
  className = "",
}: {
  steps: StepItem[];
  ariaLabel?: string;
  orientation?: "horizontal" | "vertical";
  /** In-page flows: a done step becomes a button */
  onSelect?: (key: string) => void;
  className?: string;
}) {
  const vertical = orientation === "vertical";
  return (
    <ol aria-label={ariaLabel} className={`flex ${vertical ? "flex-col" : "items-start"} ${className}`}>
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        const dot = (
          <span
            aria-hidden
            className={`relative z-10 flex shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold [&>svg]:h-4 [&>svg]:w-4 ${
              vertical ? "h-11 w-11" : "h-9 w-9"
            } ${
              s.state === "done"
                ? "border-ok bg-ok text-surface"
                : s.state === "current"
                  ? "border-brand bg-surface text-brand"
                  : "border-line-strong bg-surface text-ink-soft"
            }`}
          >
            {s.state === "done" ? <CheckIcon strokeWidth={3} /> : (s.icon ?? i + 1)}
          </span>
        );
        const label = (
          <span className={`min-w-0 ${vertical ? "pt-2 text-left" : "px-1 text-center"}`}>
            <span className={`block text-sm ${s.state === "todo" ? "text-ink-soft" : "text-ink"} ${s.state === "current" ? "font-semibold" : ""}`}>
              {s.label}
              <span className="sr-only"> ({STATE_TEXT[s.state]})</span>
            </span>
            {s.note && <span className="mt-0.5 block text-xs text-ink-soft">{s.note}</span>}
          </span>
        );
        const inner = `flex ${vertical ? "flex-row gap-4" : "flex-col items-center gap-1.5"} min-h-11`;
        const body = (
          <>
            {dot}
            {label}
          </>
        );
        return (
          <li
            key={s.key}
            aria-current={s.state === "current" ? "step" : undefined}
            className={`relative ${vertical ? (last ? "" : "pb-6") : "min-w-0 flex-1"}`}
          >
            {!last && (
              <span
                aria-hidden
                className={`absolute ${
                  vertical ? "top-12 bottom-1 left-5.5 w-0.5" : "top-4 right-[calc(-50%+1.375rem)] left-[calc(50%+1.375rem)] h-0.5"
                } ${s.state === "done" ? "bg-ok" : "bg-line"}`}
              />
            )}
            {s.href && s.state === "done" ? (
              <Link href={s.href} className={`${inner} hover:[&_span]:text-brand`}>
                {body}
              </Link>
            ) : onSelect && s.state === "done" ? (
              <button type="button" onClick={() => onSelect(s.key)} className={`${inner} w-full`}>
                {body}
              </button>
            ) : (
              <span className={inner}>{body}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export interface SetupStepImage {
  /** Path under /public */
  src: string;
  alt: string;
  caption?: string;
}

export interface SetupStepCopy {
  label: string;
  value: string;
  hint?: string;
  multiline?: boolean;
}

/** Vertical stack of SetupStep panels (an ordered list). */
export function SetupSteps({ children, className = "", ariaLabel }: { children: ReactNode; className?: string; ariaLabel?: string }) {
  return (
    <ol aria-label={ariaLabel} className={`flex flex-col gap-3 ${className}`}>
      {children}
    </ol>
  );
}

/** One numbered step: number (or a tick when done), title, status badge, body. */
export function SetupStep({
  n,
  title,
  done,
  current,
  action,
  copy,
  images,
  children,
}: {
  n: number;
  title: ReactNode;
  /** Tick instead of the number + "ผ่าน" badge. undefined = no badge. */
  done?: boolean;
  /** The next step to do: brand outline */
  current?: boolean;
  /** Button or link on the right of the title */
  action?: ReactNode;
  copy?: SetupStepCopy[];
  /** Screenshots; files that do not exist are skipped */
  images?: SetupStepImage[];
  children?: ReactNode;
}) {
  return (
    <li
      aria-current={current ? "step" : undefined}
      className={`flex flex-col gap-3 rounded-card border bg-surface p-4 shadow-card ${current ? "border-brand" : "border-line"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base font-semibold ${
              done ? "bg-ok text-surface" : current ? "bg-brand text-brand-ink" : "bg-brand-soft text-brand"
            }`}
          >
            {done ? <CheckIcon className="h-4 w-4" strokeWidth={3} /> : n}
          </span>
          <div className="min-w-0 pt-1">
            <h2 className="font-medium">
              <span className="sr-only">ขั้นที่ {n}: </span>
              {title}
            </h2>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-1">
          {done !== undefined && <Badge tone={done ? "ok" : "neutral"}>{done ? "ผ่าน" : "ยังไม่ผ่าน"}</Badge>}
          {action}
        </div>
      </div>
      {children && <div className="text-sm text-ink-soft">{children}</div>}
      {copy && copy.length > 0 && (
        <div className={`grid grid-cols-1 gap-3 ${copy.length > 1 ? "lg:grid-cols-2" : ""}`}>
          {copy.map((c) => (
            <CopyField key={c.label} label={c.label} value={c.value} hint={c.hint} multiline={c.multiline} />
          ))}
        </div>
      )}
      {images && images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((img) => (
            <StepScreenshot key={img.src} image={img} />
          ))}
        </div>
      )}
    </li>
  );
}

/** Thumbnail that opens the lightbox; hidden for good when the file is missing. */
function StepScreenshot({ image }: { image: SetupStepImage }) {
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");
  const [open, setOpen] = useState(false);
  if (state === "missing") return null;
  return (
    <figure className={state === "ok" ? "w-full sm:w-auto" : "hidden"}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`ดูรูปใหญ่: ${image.alt}`}
        className="block w-full overflow-hidden rounded-control border border-line bg-bg transition-colors hover:border-brand sm:w-auto"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static /public screenshot */}
        <img
          ref={(el) => {
            if (el?.complete && state === "loading") setState(el.naturalWidth > 0 ? "ok" : "missing");
          }}
          src={image.src}
          alt={image.alt}
          onLoad={() => setState("ok")}
          onError={() => setState("missing")}
          className="block max-h-56 w-full object-contain object-left-top sm:w-auto sm:max-w-xs"
        />
      </button>
      {image.caption && <figcaption className="mt-1 text-sm text-ink-soft">{image.caption}</figcaption>}
      <ImageLightbox src={open ? image.src : null} onClose={() => setOpen(false)} alt={image.alt} />
    </figure>
  );
}
