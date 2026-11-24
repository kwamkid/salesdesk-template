"use client";

/**
 * <ImageLightbox> — full-screen picture viewer (ported from aoocommerce components/ui/ImageLightbox.tsx).
 *
 *  - One picture: `src`. A gallery: `images` (+ `initialIndex`): arrows, ←/→ keys, swipe,
 *    counter "2 / 5", caption under the picture, thumbnail strip.
 *  - Open while `src` is set or `images` is non-empty; close sets them back to null.
 *  - Closes on Esc, the × button or a tap on the dark background. Esc does not also close an open
 *    Modal behind it. Drawn in a portal above everything; clicks do not reach the row behind.
 *
 * const [open, setOpen] = useState<number | null>(null);
 * <ImageLightbox images={open === null ? null : pics} initialIndex={open ?? 0} onClose={() => setOpen(null)} />
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, LoadingIcon } from "@/lib/icons";
import { FLOATING_Z } from "./floating-panel";

export interface LightboxImage {
  /** Full-size picture URL */
  src: string;
  /** Text under the picture, e.g. "มาชมโครงการ 12 พ.ย. 2569" */
  caption?: string;
}

const SWIPE_MIN_PX = 50;

export function ImageLightbox({
  src,
  images,
  initialIndex = 0,
  loading = false,
  onClose,
  alt = "รูปภาพ",
}: {
  src?: string | null;
  images?: LightboxImage[] | null;
  initialIndex?: number;
  /** Gallery still loading: a spinner next to the counter */
  loading?: boolean;
  onClose: () => void;
  alt?: string;
}) {
  const list = useMemo<LightboxImage[]>(
    () => (images && images.length > 0 ? images : src ? [{ src }] : []),
    [images, src],
  );
  const count = list.length;
  const open = count > 0;
  const multi = count > 1;
  const clamp = (i: number) => (count === 0 ? 0 : Math.min(Math.max(i, 0), count - 1));

  // Follow initialIndex whenever it, the list size or open changes (set during render, no effect).
  const syncKey = `${open}|${initialIndex}|${count}`;
  const [state, setState] = useState({ key: syncKey, index: clamp(initialIndex) });
  if (state.key !== syncKey) setState({ key: syncKey, index: clamp(initialIndex) });
  const index = clamp(state.index);
  const step = (d: number) => setState((s) => ({ ...s, index: (((clamp(s.index) + d) % count) + count) % count }));
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  });
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Capture phase + stop: the Modal behind keeps its place.
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
      } else if (count > 1 && e.key === "ArrowLeft") stepRef.current(-1);
      else if (count > 1 && e.key === "ArrowRight") stepRef.current(1);
    };
    document.addEventListener("keydown", onKey, true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prev;
    };
  }, [open, count]);

  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!multi) return;
    stripRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${index}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [index, multi]);

  const touchX = useRef<number | null>(null);

  if (!open || typeof document === "undefined") return null;
  const current = list[index];
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const close = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    onClose();
  };

  const roundBtn =
    "inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white/90 transition-colors hover:bg-black/60 hover:text-white";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={multi ? `ดูรูป ${index + 1} จาก ${count}` : "ดูรูป"}
      aria-roledescription={multi ? "carousel" : undefined}
      className="fixed inset-0 flex flex-col bg-black/85"
      style={{ zIndex: FLOATING_Z + 2 }}
      onClick={close}
      onPointerDown={stop}
    >
      <button type="button" onClick={close} aria-label="ปิดรูป" className={`absolute top-3 right-3 z-10 ${roundBtn}`}>
        <CloseIcon className="h-6 w-6" aria-hidden />
      </button>
      {(multi || loading) && (
        <div className="absolute top-5 left-4 z-10 flex items-center gap-2 rounded-full bg-black/40 px-3 py-1 text-sm text-white tabular-nums">
          {multi && `${index + 1} / ${count}`}
          {loading && <LoadingIcon className="h-4 w-4 animate-spin" aria-label="กำลังโหลด" />}
        </div>
      )}

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-2 pt-16 pb-2 md:px-16"
        onTouchStart={(e) => {
          touchX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchX.current;
          touchX.current = null;
          const end = e.changedTouches[0]?.clientX;
          if (!multi || start == null || end == null) return;
          const dx = end - start;
          if (Math.abs(dx) >= SWIPE_MIN_PX) step(dx < 0 ? 1 : -1);
        }}
      >
        {multi && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              step(-1);
            }}
            aria-label="รูปก่อนหน้า"
            className={`absolute top-1/2 left-2 z-10 -translate-y-1/2 md:left-4 ${roundBtn}`}
          >
            <ChevronLeftIcon className="h-6 w-6" aria-hidden />
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element -- signed Storage URLs, no Next image config */}
        <img
          key={current.src}
          src={current.src}
          alt={current.caption || alt}
          draggable={false}
          onClick={stop}
          className="max-h-full max-w-full rounded-control object-contain shadow-2xl select-none"
        />
        {multi && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              step(1);
            }}
            aria-label="รูปถัดไป"
            className={`absolute top-1/2 right-2 z-10 -translate-y-1/2 md:right-4 ${roundBtn}`}
          >
            <ChevronRightIcon className="h-6 w-6" aria-hidden />
          </button>
        )}
      </div>

      <div className="min-h-8 shrink-0 px-4 text-center text-base text-white" onClick={stop}>
        {current.caption}
      </div>

      {multi && (
        <div ref={stripRef} className="mx-auto flex max-w-full shrink-0 gap-2 overflow-x-auto px-4 pt-1 pb-4" onClick={stop}>
          {list.map((img, i) => (
            <button
              key={`${img.src}-${i}`}
              type="button"
              data-idx={i}
              onClick={() => setState((s) => ({ ...s, index: i }))}
              aria-label={`ไปรูปที่ ${i + 1}${img.caption ? ` · ${img.caption}` : ""}`}
              aria-current={i === index}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-control bg-white/10 ring-2 transition-opacity ${
                i === index ? "opacity-100 ring-white" : "opacity-60 ring-transparent hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
