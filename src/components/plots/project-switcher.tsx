"use client";

import { usePathname, useRouter } from "next/navigation";
import { useId, useTransition } from "react";
import { FormSelect } from "@/components/ui/form-select";
import type { ProjectOption } from "./types";

/** Picks the project and remembers it in ?project= (so a shared link opens the same project). */
export function ProjectSwitcher({ projects, value }: { projects: ProjectOption[]; value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const id = useId();

  if (projects.length < 2) return null;
  return (
    <div className="flex w-full max-w-sm flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        โครงการ
      </label>
      <FormSelect
        id={id}
        value={value}
        disabled={pending}
        onChange={(v) => start(() => router.replace(`${pathname}?project=${v}`))}
        options={projects.map((p) => ({ id: p.id, label: p.name, subtitle: p.is_open ? undefined : "ปิดการขาย" }))}
      />
    </div>
  );
}
