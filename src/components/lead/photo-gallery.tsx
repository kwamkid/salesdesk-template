"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { ImageLightbox, type LightboxImage } from "@/components/ui/image-lightbox";

type GalleryPhoto = LightboxImage & { path: string };
type Gallery = { photos: GalleryPhoto[]; openAt: (i: number) => void };

const GalleryContext = createContext<Gallery | null>(null);

/** Wrap a timeline: every <ActivityPhoto> inside opens all `photos` as one gallery. */
export function PhotoGallery({ photos, children }: { photos: GalleryPhoto[]; children: ReactNode }) {
  const [index, setIndex] = useState<number | null>(null);
  return (
    <GalleryContext.Provider value={{ photos, openAt: setIndex }}>
      {children}
      <ImageLightbox images={index === null ? null : photos} initialIndex={index ?? 0} onClose={() => setIndex(null)} alt="รูปตอนพาชม" />
    </GalleryContext.Provider>
  );
}

/** Thumbnail button. Inside <PhotoGallery>: opens the gallery at this photo; alone: just this photo. */
export function PhotoThumb({ path, src, alt }: { path: string; src: string; alt: string }) {
  const gallery = useContext(GalleryContext);
  const [alone, setAlone] = useState(false);
  const index = gallery?.photos.findIndex((p) => p.path === path) ?? -1;
  return (
    <>
      <button
        type="button"
        onClick={() => (gallery && index >= 0 ? gallery.openAt(index) : setAlone(true))}
        aria-label={gallery && gallery.photos.length > 1 ? `เปิดรูป (${gallery.photos.length} รูปของลูกค้านี้)` : "เปิดรูปขนาดเต็ม"}
        className="block w-fit overflow-hidden rounded-control border border-line transition-opacity hover:opacity-90"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- signed URL changes every hour */}
        <img src={src} alt={alt} loading="lazy" className="h-24 w-32 object-cover" />
      </button>
      {alone && <ImageLightbox src={src} alt={alt} onClose={() => setAlone(false)} />}
    </>
  );
}
