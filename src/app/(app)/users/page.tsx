import Link from "next/link";
import { Notice, PageTitle } from "@/components/ui/card";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { requireMe } from "@/lib/auth";
import { loadUsers } from "./data";
import { InviteButton, UsersTable } from "./user-forms";

export const metadata = { title: "พนักงาน" };

/** Everyone allowed in (active or disabled), newest first is up to loadUsers(). Invite = button top right. */
export default async function UsersPage() {
  const me = await requireMe(["admin"]);
  const { users, projects } = await loadUsers();
  const listed = users.filter((u) => u.status !== "pending");
  const pending = users.length - listed.length;

  return (
    <>
      <SettingsTabs active="users" />
      <PageTitle
        title="พนักงาน"
        sub={`${listed.length} คน · กดรูปดินสอเพื่อแก้ระดับและโครงการที่ดูแล`}
        action={<InviteButton projects={projects} />}
      />
      {pending > 0 && (
        <Notice tone="warn">
          มี {pending} คนขอเข้าระบบ รออนุมัติ ·{" "}
          <Link href="/queue" className="link">
            ไปอนุมัติ
          </Link>
        </Notice>
      )}
      <UsersTable
        users={listed}
        projects={projects}
        meId={me.id}
        targets={listed}
      />
    </>
  );
}
