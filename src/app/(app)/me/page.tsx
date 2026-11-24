import { Button } from "@/components/ui/button";
import { Badge, Card, PageTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { PrefsForm, type PrefsValues } from "@/components/notifications/prefs-form";
import { PushSettings } from "@/components/notifications/push-settings";
import { InstallCard } from "@/components/pwa/install-card";
import { ROLE_LABEL, type Role } from "@/config/roles";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MonthStats } from "./month-stats";
import { logout } from "../../(auth)/actions";
import { updateMyName } from "../users/actions";

export const metadata = { title: "ฉัน" };

// Digest hour when the user has never saved settings (matches DEFAULT_DIGEST_HOUR in src/lib/push.ts).
const DEFAULT_DIGEST_HOUR: Record<Role, number> = { sales: 8, executive: 18, admin: 8 };
const DIGEST_HINT: Record<Role, string> = {
  sales: "ทุกเช้า: วันนี้ต้องตามกี่ราย เลยกำหนดกี่ราย",
  executive: "ทุกเย็น: ลีดใหม่ นัดชม จอง และงานเลยกำหนดของทีม",
  admin: "เฉพาะวันที่มีผู้ใช้รออนุมัติ หรือส่งข้อมูลไป Meta ไม่สำเร็จ",
};

/** Profile page: name, rights, this month's results (sales), install the app, notification settings. */
export default async function MePage() {
  const me = await requireMe();
  const supabase = await createClient();
  // Row Level Security returns only the projects this user may see.
  const [{ data: projects }, { data: prefRow }] = await Promise.all([
    supabase.from("projects").select("id, name").order("name"),
    supabase
      .from("notification_prefs")
      .select("daily_digest, digest_hour, instant, quiet_from, quiet_to, project_ids")
      .eq("user_id", me.id)
      .maybeSingle(),
  ]);
  const prefs: PrefsValues = (prefRow as PrefsValues | null) ?? {
    daily_digest: true,
    digest_hour: DEFAULT_DIGEST_HOUR[me.role],
    instant: true,
    quiet_from: null,
    quiet_to: null,
    project_ids: null,
  };

  return (
    <>
      <PageTitle title="ฉัน" sub={me.email} />

      <Card>
        <form action={updateMyName} className="flex flex-col gap-4">
          <Field label="ชื่อที่ใช้ในระบบ" required>
            <Input name="full_name" defaultValue={me.full_name} required maxLength={100} />
          </Field>
          <Button type="submit" variant="secondary" full>
            บันทึกชื่อ
          </Button>
        </form>
      </Card>

      <Card className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">สิทธิ์ของฉัน</h2>
        <div className="flex flex-wrap gap-1">
          <Badge tone="brand">{ROLE_LABEL[me.role]}</Badge>
          {(projects ?? []).map((p) => (
            <Badge key={p.id}>{p.name}</Badge>
          ))}
        </div>
        {(projects ?? []).length === 0 && <p className="text-sm text-ink-soft">ยังไม่มีโครงการที่ดูแล</p>}
      </Card>

      {me.role === "sales" && <MonthStats />}

      <InstallCard />

      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">การแจ้งเตือน</h2>
        <PushSettings />
        <hr className="border-line" />
        <PrefsForm
          values={prefs}
          digestHint={DIGEST_HINT[me.role]}
          projects={me.role === "executive" ? (projects ?? []) : undefined}
        />
      </Card>

      <form action={logout}>
        <Button type="submit" variant="secondary" full>
          ออกจากระบบ
        </Button>
      </form>
    </>
  );
}
