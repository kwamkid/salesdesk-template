"use client";

import { useState } from "react";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { ProjectCover } from "./project-cover";

/** Project cover that opens full screen on tap (ImageLightbox). Without a picture it is the plain placeholder. */
export function ZoomableCover({ url, name }: { url: string | null; name: string }) {
  const [open, setOpen] = useState(false);
  if (!url) return <ProjectCover url={null} name={name} />;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`ดูรูปโครงการ ${name} เต็มจอ`}
        className="block h-full w-full cursor-zoom-in"
      >
        <ProjectCover url={url} name={name} />
      </button>
      <ImageLightbox src={open ? url : null} alt={`รูปโครงการ ${name}`} onClose={() => setOpen(false)} />
    </>
  );
}
