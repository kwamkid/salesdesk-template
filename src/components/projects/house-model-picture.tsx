import { HouseModelIcon } from "@/lib/icons";

/** House model picture (signed URL), or a themed placeholder with a house icon and the model's first letter.
 *  The parent sets the size; the picture fills it. Works in Server and Client Components. */
export function HouseModelPicture({
  url,
  name,
  small,
  className = "",
}: {
  url: string | null;
  name: string;
  /** Thumbnail size: smaller letter, no big background icon. */
  small?: boolean;
  className?: string;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- signed URL of a private file
      <img src={url} alt={`รูปแบบบ้าน ${name}`} className={`h-full w-full object-cover ${className}`} />
    );
  }
  return (
    <div
      role="img"
      aria-label={`ยังไม่มีรูปแบบบ้าน ${name}`}
      className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-brand-soft text-brand ${className}`}
    >
      {small ? (
        <HouseModelIcon aria-hidden strokeWidth={1.5} className="h-6 w-6" />
      ) : (
        <>
          <HouseModelIcon aria-hidden strokeWidth={1.25} className="absolute -right-4 -bottom-6 h-40 w-40 opacity-15" />
          <span
            aria-hidden
            className="flex h-16 w-16 items-center justify-center rounded-full bg-surface text-2xl font-bold shadow-card"
          >
            {name.trim().charAt(0).toUpperCase() || "?"}
          </span>
        </>
      )}
    </div>
  );
}
