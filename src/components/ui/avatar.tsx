"use client";

import { useRef, useState, type ReactNode } from "react";
import { SOFT, type SoftTone } from "./card";
import { Popover } from "./popover";

/** Optional contact card: given, the avatar becomes a button that shows name + role + phone / email. */
export type AvatarDetails = { role?: string; phone?: string | null; email?: string | null };

/** Tones a letter avatar may get. Picked by a stable hash of the name, so a person keeps one colour. */
const TONES: SoftTone[] = ["brand", "ok", "warn", "info", "purple", "danger"];

const SIZE = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
} as const;

function toneOf(name: string): SoftTone {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return TONES[Math.abs(h) % TONES.length];
}

/** Round profile picture (profiles.avatar_url). Falls back to the first letter on a tinted circle
 *  when there is no picture or it fails to load. Decorative: the name next to it carries the meaning. */
export function Avatar({
  name,
  url,
  size = "md",
  details,
}: {
  name: string;
  url?: string | null;
  size?: keyof typeof SIZE;
  details?: AvatarDetails;
}) {
  if (details) {
    return (
      <PersonPopover name={name} details={details}>
        <AvatarPicture name={name} url={url} size={size} />
      </PersonPopover>
    );
  }
  return <AvatarPicture name={name} url={url} size={size} />;
}

function AvatarPicture({ name, url, size }: { name: string; url?: string | null; size: keyof typeof SIZE }) {
  const [failed, setFailed] = useState(false);
  const label = name.trim() || "?";
  if (url && !failed) {
    return (
      // A plain <img>: Google pictures and /samples files need no Next image config.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        aria-hidden
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${SIZE[size]} shrink-0 rounded-full bg-bg object-cover`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`${SIZE[size]} inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${SOFT[toneOf(label)]}`}
    >
      {label.charAt(0).toUpperCase()}
    </span>
  );
}

/** Avatar + name on one line. With `details` the pair is a button that shows the contact card.
 *  Do not pass `details` inside a link (a button cannot sit in a link). */
export function AvatarName({
  name,
  url,
  size = "sm",
  details,
}: {
  name: string;
  url?: string | null;
  size?: keyof typeof SIZE;
  details?: AvatarDetails;
}) {
  const body = (
    <span className="inline-flex min-w-0 items-center gap-2">
      <AvatarPicture name={name} url={url} size={size} />
      <span className="min-w-0 truncate">{name}</span>
    </span>
  );
  return details ? (
    <PersonPopover name={name} details={details}>
      {body}
    </PersonPopover>
  ) : (
    body
  );
}

/** Button around an avatar (or avatar + name) that opens a small contact card. */
function PersonPopover({ name, details, children }: { name: string; details: AvatarDetails; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={`ดูข้อมูลของ ${name}`}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="-m-1 inline-flex min-h-11 min-w-0 items-center rounded-control p-1 text-left hover:bg-sidebar-hover"
      >
        {children}
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref} align="start" width={260} ariaLabel={`ข้อมูลของ ${name}`}>
        <p className="font-semibold break-words">{name}</p>
        {details.role && <p className="text-sm text-ink-soft">{details.role}</p>}
        {(details.phone || details.email) && (
          <div className="mt-2 flex flex-col gap-1 text-sm">
            {details.phone && (
              <a href={`tel:${details.phone}`} className="inline-flex min-h-11 items-center text-brand underline-offset-2 hover:underline">
                โทร {details.phone}
              </a>
            )}
            {details.email && (
              <a href={`mailto:${details.email}`} className="inline-flex min-h-11 items-center break-all text-brand underline-offset-2 hover:underline">
                {details.email}
              </a>
            )}
          </div>
        )}
      </Popover>
    </>
  );
}
