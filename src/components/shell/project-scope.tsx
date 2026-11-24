"use client";

import { startNav } from "@/components/shell/nav-progress";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Popover } from "@/components/ui/popover";
import type { ScopeProject } from "@/lib/project-scope";
import { setScope } from "@/lib/project-scope-actions";
import { AllProjectsIcon, CheckIcon, ProjectIcon, ProjectSwitchIcon } from "@/lib/icons";

/** Project picker at the top of the left menu (and the phone top bar), like switching accounts.
 *  Every page then shows the picked project; "ทุกโครงการ" shows them all. */
export function ProjectScope({
  projects,
  currentId,
  allLabel,
  compact = false,
}: {
  projects: ScopeProject[];
  currentId: string | null;
  allLabel: string;
  /** Phone top bar: one short line. */
  compact?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  if (projects.length === 0) return null;
  const current = projects.find((p) => p.id === currentId) ?? null;
  const single = projects.length === 1;
  const label = current?.name ?? allLabel;
  const Icon = current ? ProjectIcon : AllProjectsIcon;

  function pick(value: string) {
    setOpen(false);
    startNav();
    start(async () => {
      await setScope(value);
      // A ?project= in the URL would override the new pick, so drop it.
      if (params.has("project")) {
        const next = new URLSearchParams(params);
        next.delete("project");
        const qs = next.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      } else router.refresh();
    });
  }

  const options: { value: string; name: string; sub?: string; all?: boolean }[] = [
    { value: "all", name: allLabel, all: true },
    ...projects.map((p) => ({ value: p.id, name: p.name, sub: p.is_open ? undefined : "ปิดการขาย" })),
  ];

  return (
    <>
      <button
        ref={ref}
        type="button"
        disabled={single || pending}
        onClick={() => setOpen(!open)}
        aria-label={`โครงการที่ดูอยู่: ${label}${single ? "" : " (กดเพื่อเปลี่ยน)"}`}
        aria-expanded={open}
        className={`flex min-h-11 w-full min-w-0 items-center gap-2.5 rounded-control text-left transition-colors enabled:hover:bg-sidebar-hover disabled:cursor-default ${
          compact ? "px-2" : "border border-line bg-surface px-2.5 py-1.5"
        } ${pending ? "opacity-60" : ""}`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-brand-soft text-brand">
          <Icon className="h-4.5 w-4.5" aria-hidden />
        </span>
        <span className="nav-label min-w-0 flex-1" aria-hidden>
          {!compact && <span className="block text-xs text-ink-soft">โครงการ</span>}
          <span className="block truncate text-sm font-semibold text-ink">{label}</span>
        </span>
        {!single && <ProjectSwitchIcon className="nav-label h-4 w-4 shrink-0 text-ink-soft" aria-hidden />}
      </button>

      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref} align="start" width={280} ariaLabel="เลือกโครงการ">
        <ul className="flex max-h-[60vh] flex-col gap-0.5 overflow-y-auto p-1.5">
          {options.map((o) => {
            const on = o.all ? current === null : o.value === current?.id;
            const OptIcon = o.all ? AllProjectsIcon : ProjectIcon;
            return (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => pick(o.value)}
                  aria-current={on ? "true" : undefined}
                  className={`flex min-h-11 w-full items-center gap-2.5 rounded-control px-2.5 text-left text-sm transition-colors hover:bg-sidebar-hover ${
                    on ? "bg-sidebar-active font-semibold text-sidebar-active-ink" : "text-ink"
                  }`}
                >
                  <OptIcon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{o.name}</span>
                    {o.sub && <span className="block text-xs text-ink-soft">{o.sub}</span>}
                  </span>
                  {on && <CheckIcon className="h-4 w-4 shrink-0" aria-label="เลือกอยู่" />}
                </button>
                {o.all && <div className="mx-2 my-1 border-t border-line" />}
              </li>
            );
          })}
        </ul>
      </Popover>
    </>
  );
}
