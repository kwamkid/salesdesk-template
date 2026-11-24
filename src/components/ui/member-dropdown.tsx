"use client";

import { startNav } from "@/components/shell/nav-progress";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Avatar } from "./avatar";
import { FormSelect } from "./form-select";
import { MENU_ICON } from "@/lib/icons";

export type Member = { id: string; name: string; url?: string | null };

const TeamIcon = MENU_ICON.team;

/** <MemberDropdown> — the one way to pick a staff member (with profile pictures) on every page.
 *  Kept in the URL (?<param>=<id>); changing it applies at once.
 *  `extra`: options before the people (e.g. "ฉัน"). value "" = everybody (`allLabel`). */
export function MemberDropdown({
  param = "owner",
  value,
  people,
  allLabel = "ทุกคน",
  extra = [],
  label = "พนักงาน",
}: {
  param?: string;
  value: string;
  people: Member[];
  allLabel?: string;
  extra?: Member[];
  label?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  function pick(v: string) {
    const next = new URLSearchParams(params);
    if (v) next.set(param, v);
    else next.delete(param);
    const qs = next.toString();
    startNav();
    start(() =>
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }),
    );
  }

  return (
    <FormSelect
      aria-label={label}
      value={value}
      disabled={pending}
      onChange={pick}
      options={[
        {
          id: "",
          label: allLabel,
          icon: <TeamIcon className="h-6 w-6 text-ink-soft" aria-hidden />,
        },
        ...[...extra, ...people].map((p) => ({
          id: p.id,
          label: p.name,
          icon: <Avatar name={p.name} url={p.url} size="sm" />,
        })),
      ]}
    />
  );
}
