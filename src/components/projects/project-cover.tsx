import { ProjectIcon } from "@/lib/icons";

/** Project cover picture (signed URL), or a themed placeholder with a building icon and the project's first letter.
 *  The parent sets the size; the cover fills it. Works in Server and Client Components. */
export function ProjectCover({ url, name, className = "" }: { url: string | null; name: string; className?: string }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- signed URL of a private file
      <img src={url} alt={`รูปโครงการ ${name}`} className={`h-full w-full object-cover ${className}`} />
    );
  }
  return (
    <div
      role="img"
      aria-label={`ยังไม่มีรูปโครงการ ${name}`}
      className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-brand-soft text-brand ${className}`}
    >
      <ProjectIcon aria-hidden strokeWidth={1.25} className="absolute -right-4 -bottom-6 h-40 w-40 opacity-15" />
      <span
        aria-hidden
        className="flex h-16 w-16 items-center justify-center rounded-full bg-surface text-2xl font-bold shadow-card"
      >
        {name.trim().charAt(0).toUpperCase() || "?"}
      </span>
    </div>
  );
}
