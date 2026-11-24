import { PageTitle } from "@/components/ui/card";
import { StatusTabs } from "@/components/ui/status-tabs";
import { ROLE_LABEL, ROLES, type Role } from "@/config/roles";
import { requireMe } from "@/lib/auth";
import { loadUsers } from "./data";
import { InviteForm, UsersTable } from "./user-forms";

export const metadata = { title: "ผู้ใช้" };

const ROLE_TONE = { admin: "purple", executive: "info", sales: "brand" } as const;

/** Tabs (?tab=): ทั้งหมด · each role (users still allowed in) · ปิดสิทธิ์. */
export default async function UsersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const me = await requireMe(["admin"]);
  const { tab: tabParam } = await searchParams;
  const { users, projects } = await loadUsers();
  const listed = users.filter((u) => u.status !== "pending");
  const tab = tabParam === "disabled" || ROLES.includes(tabParam as Role) ? tabParam! : "all";
  const shown =
    tab === "all"
      ? listed
      : tab === "disabled"
        ? listed.filter((u) => u.status === "disabled")
        : listed.filter((u) => u.role === tab && u.status === "active");

  return (
    <>
      <PageTitle title="ผู้ใช้" sub={`${listed.length} คน · คนที่รออนุมัติอยู่ในเมนูงานรอ`} />
      <InviteForm projects={projects} />
      <StatusTabs
        activeKey={tab}
        tabs={[
          { key: "all", label: "ทั้งหมด", count: listed.length, href: "/users" },
          ...ROLES.map((r) => ({
            key: r,
            label: ROLE_LABEL[r],
            count: listed.filter((u) => u.role === r && u.status === "active").length,
            tone: ROLE_TONE[r],
            href: `/users?tab=${r}`,
          })),
          { key: "disabled", label: "ปิดสิทธิ์", count: listed.filter((u) => u.status === "disabled").length, tone: "danger", href: "/users?tab=disabled" },
        ]}
      />
      <UsersTable users={shown} projects={projects} meId={me.id} targets={listed} />
    </>
  );
}
