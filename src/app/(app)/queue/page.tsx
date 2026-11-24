import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, Notice, PageTitle, StageBadge } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { StatusTabs } from "@/components/ui/status-tabs";
import { Tooltip } from "@/components/ui/tooltip";
import { requireMe } from "@/lib/auth";
import { afterLeadChange } from "@/lib/background";
import { thDateTime } from "@/lib/format";
import { AllDoneIcon } from "@/lib/icons";
import { flushMetaEvents } from "@/lib/meta";
import { createClient } from "@/lib/supabase/server";
import { loadUsers } from "../users/data";
import { ApproveCard } from "../users/user-forms";

export const metadata = { title: "งานรอ" };

const PAGE = 30;
const SOURCE_LABEL: Record<string, string> = { app: "เพิ่มในแอป", web: "ฟอร์มเว็บไซต์", import: "นำเข้าไฟล์" };

/** Give a lead with no owner to a sales person of the same project. */
async function assignLead(form: FormData) {
  "use server";
  await requireMe(["admin"]);
  const leadId = String(form.get("lead_id") ?? "");
  const ownerId = String(form.get("owner_id") ?? "");
  if (!leadId || !ownerId) return;
  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select("project_id").eq("id", leadId).maybeSingle();
  if (!lead) return;
  const { data: member } = await supabase
    .from("project_members")
    .select("user_id, profiles!inner(role, status)")
    .eq("project_id", lead.project_id)
    .eq("user_id", ownerId)
    .eq("profiles.role", "sales")
    .eq("profiles.status", "active")
    .maybeSingle();
  if (!member) return;
  await supabase.from("leads").update({ owner_id: ownerId }).eq("id", leadId).is("owner_id", null);
  afterLeadChange();
  revalidatePath("/queue");
}

/** Send the failed Meta events again now (also the ones that already used up 5 tries). */
async function retryMeta() {
  "use server";
  await requireMe(["admin"]);
  const res = await flushMetaEvents({ retryFailed: true, force: true });
  revalidatePath("/queue");
  redirect(`/queue?sent=${res.sent}&failed=${res.failed}`);
}

type One<T> = T | T[] | null;
const one = <T,>(x: One<T>): T | null => (Array.isArray(x) ? (x[0] ?? null) : x);

/** Admin's first page: users waiting, leads with no owner, Meta events that failed. */
export default async function QueuePage({ searchParams }: { searchParams: Promise<{ sent?: string; failed?: string; show?: string }> }) {
  await requireMe(["admin"]);
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ users, projects }, unowned, failed] = await Promise.all([
    loadUsers(),
    supabase
      .from("leads")
      .select("id, full_name, project_id, source, stage, created_at, projects(name)", { count: "exact" })
      .is("owner_id", null)
      .not("stage", "in", "(transferred,lost,unqualified)")
      .order("created_at")
      .limit(PAGE),
    supabase
      .from("meta_events")
      .select("id, stage, event_name, error, attempts, created_at, leads(full_name)", { count: "exact" })
      .eq("status", "failed")
      .order("created_at")
      .limit(PAGE),
  ]);

  const pending = users.filter((u) => u.status === "pending");
  const sales = users.filter((u) => u.role === "sales" && u.status === "active");
  const leads = (unowned.data ?? []) as {
    id: string;
    full_name: string;
    project_id: string;
    source: string;
    stage: string;
    created_at: string;
    projects: One<{ name: string }>;
  }[];
  const events = (failed.data ?? []) as {
    id: number;
    stage: string;
    event_name: string;
    error: string;
    attempts: number;
    created_at: string;
    leads: One<{ full_name: string }>;
  }[];
  const leadTotal = unowned.count ?? leads.length;
  const eventTotal = failed.count ?? events.length;
  const projectName = new Map(projects.map((p) => [p.id, p.name]));

  const show = ["users", "leads", "meta"].includes(sp.show ?? "") ? sp.show! : "all";
  const want = (k: string) => show === "all" || show === k;
  const parts = [
    pending.length && `ผู้ใช้รออนุมัติ ${pending.length} คน`,
    leadTotal && `ลีดไม่มีเจ้าของ ${leadTotal} ราย`,
    eventTotal && `ส่ง Meta ไม่สำเร็จ ${eventTotal} รายการ`,
  ].filter(Boolean);

  return (
    <>
      <PageTitle title="งานรอดำเนินการ" sub={parts.length ? parts.join(" · ") : undefined} />

      <StatusTabs
        activeKey={show}
        tabs={[
          { key: "all", label: "ทั้งหมด", count: pending.length + leadTotal + eventTotal, href: "/queue" },
          { key: "users", label: "ผู้ใช้รออนุมัติ", count: pending.length, tone: "warn", href: "/queue?show=users" },
          { key: "leads", label: "ลีดไม่มีเจ้าของ", count: leadTotal, tone: "brand", href: "/queue?show=leads" },
          { key: "meta", label: "ส่ง Meta ไม่สำเร็จ", count: eventTotal, tone: "danger", href: "/queue?show=meta" },
        ]}
      />

      {sp.sent !== undefined && (
        <Notice tone={Number(sp.failed) > 0 ? "warn" : "ok"}>
          ส่งไป Meta สำเร็จ {Number(sp.sent) || 0} รายการ · ไม่สำเร็จ {Number(sp.failed) || 0} รายการ
        </Notice>
      )}

      {parts.length > 0 &&
        ((show === "users" && pending.length === 0) ||
          (show === "leads" && leads.length === 0) ||
          (show === "meta" && events.length === 0)) && <EmptyState icon={AllDoneIcon} tone="ok" title="หมวดนี้ไม่มีงานรอ" />}

      {parts.length === 0 && (
        <EmptyState icon={AllDoneIcon} tone="ok" title="ไม่มีงานรอ เคลียร์ครบแล้ว" hint="คนที่สมัครโดยไม่มีลิงก์เชิญ ลีดที่ยังไม่มีเจ้าของ และข้อมูลที่ส่ง Meta ไม่สำเร็จจะขึ้นที่นี่" />
      )}

      {want("users") && pending.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">ผู้ใช้รออนุมัติ</h2>
          <div className="grid items-start gap-2 lg:grid-cols-2 2xl:grid-cols-3">
            {pending.map((u) => (
              <ApproveCard key={u.id} user={u} projects={projects} />
            ))}
          </div>
        </section>
      )}

      {want("leads") && leads.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">ลีดที่ยังไม่มีเจ้าของ</h2>
          {leads.map((l) => {
            const choices = sales.filter((u) => u.projectIds.includes(l.project_id));
            const project = one(l.projects)?.name ?? projectName.get(l.project_id) ?? "-";
            return (
              <Card
                key={l.id}
                className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between md:gap-4 md:px-4"
              >
                <div className="flex min-w-0 items-start justify-between gap-2 md:flex-1 md:justify-start">
                  <div className="min-w-0">
                    <Link href={`/leads/${l.id}`} className="font-medium underline-offset-2 hover:underline">
                      {l.full_name}
                    </Link>
                    <p className="text-sm text-ink-soft">
                      {project} · {thDateTime(l.created_at)} · {SOURCE_LABEL[l.source] ?? l.source}
                    </p>
                  </div>
                  <StageBadge stage={l.stage} />
                </div>
                {choices.length === 0 ? (
                  <p className="text-sm text-ink-soft md:max-w-sm">โครงการนี้ยังไม่มีเซลส์ มอบหมายเซลส์ให้โครงการได้ที่เมนูผู้ใช้</p>
                ) : (
                  <form action={assignLead} className="flex flex-col gap-2 sm:flex-row md:shrink-0">
                    <input type="hidden" name="lead_id" value={l.id} />
                    <Select
                      name="owner_id"
                      required
                      defaultValue=""
                      aria-label={`เลือกเซลส์ให้ ${l.full_name}`}
                      className="md:w-60"
                    >
                      <option value="" disabled>
                        เลือกเซลส์ของ {project}
                      </option>
                      {choices.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.full_name || u.email}
                        </option>
                      ))}
                    </Select>
                    <Button type="submit" className="sm:shrink-0">
                      มอบหมายลีด
                    </Button>
                  </form>
                )}
              </Card>
            );
          })}
          {leadTotal > leads.length && (
            <p className="text-sm text-ink-soft">แสดง {leads.length} รายที่เก่าที่สุด จาก {leadTotal} ราย มอบหมายแล้วรายการถัดไปจะขึ้นมาเอง</p>
          )}
        </section>
      )}

      {want("meta") && events.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">ส่งข้อมูลไป Meta ไม่สำเร็จ</h2>
            <form action={retryMeta}>
              <Button type="submit" variant="secondary">
                ส่งใหม่ทั้งหมด
              </Button>
            </form>
          </div>
          <p className="text-sm text-ink-soft">
            ถ้าขึ้นซ้ำทุกครั้ง ตรวจ Pixel ID และ token ที่{" "}
            <Link href="/settings" className="text-brand underline">
              หน้าตั้งค่า
            </Link>
          </p>
          {events.map((e) => (
            <Card
              key={e.id}
              className="flex flex-col gap-1 p-3 md:flex-row md:items-center md:justify-between md:gap-4 md:px-4"
            >
              <div className="flex min-w-0 flex-col gap-0.5 md:flex-1">
                <p className="font-medium">
                  {e.event_name} · {one(e.leads)?.full_name ?? "-"}
                </p>
                <Tooltip text={e.error} onlyWhenClipped>
                  <p className="line-clamp-2 text-sm break-words text-ink-soft">{e.error || "ไม่มีข้อความ error"}</p>
                </Tooltip>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:shrink-0 md:justify-end">
                <StageBadge stage={e.stage} />
                <Badge tone="danger">ลองแล้ว {e.attempts} ครั้ง</Badge>
                <span className="text-xs whitespace-nowrap text-ink-soft">{thDateTime(e.created_at)}</span>
              </div>
            </Card>
          ))}
          {eventTotal > events.length && (
            <p className="text-sm text-ink-soft">แสดง {events.length} จาก {eventTotal} รายการ กดส่งใหม่ได้ครั้งละ 50 รายการ</p>
          )}
        </section>
      )}
    </>
  );
}
