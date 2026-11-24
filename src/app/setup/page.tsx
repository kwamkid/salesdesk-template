import Link from "next/link";
import { SetupStep, SetupSteps } from "@/components/ui/stepper";
import { APP } from "@/config/app";
import { hasSupabaseEnv, SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

// Always check live. This page must never be cached.
export const dynamic = "force-dynamic";

type Check = { title: string; ok: boolean; help: string };

async function runChecks(): Promise<Check[]> {
  const urlOk = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("xxxxxxxx");
  const keyOk = SUPABASE_KEY.length > 20;
  const secretOk = (process.env.SUPABASE_SECRET_KEY ?? "").length > 20;

  let reachable = false;
  let googleOn = false;
  let tablesOk = false;
  if (hasSupabaseEnv) {
    const headers = { apikey: SUPABASE_KEY };
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers, cache: "no-store" });
      reachable = res.ok;
      // true when the Google provider is switched on in Supabase Auth
      googleOn = res.ok && (await res.json()).external?.google === true;
    } catch {
      reachable = false;
    }
    try {
      // 404 = the table does not exist: the database script has not been run yet.
      const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id&limit=1`, { headers, cache: "no-store" });
      tablesOk = res.status !== 404;
    } catch {
      tablesOk = false;
    }
  }

  return [
    {
      title: "ใส่ที่อยู่โปรเจกต์ Supabase แล้ว",
      ok: urlOk,
      help: "เปิดไฟล์ .env.local แล้วใส่ค่า NEXT_PUBLIC_SUPABASE_URL",
    },
    {
      title: "ใส่ Publishable key แล้ว",
      ok: keyOk,
      help: "ใส่ค่า NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ในไฟล์ .env.local",
    },
    {
      title: "ใส่ Secret key แล้ว",
      ok: secretOk,
      help: "ใส่ค่า SUPABASE_SECRET_KEY ในไฟล์ .env.local (ใช้กับงานตั้งเวลาและการส่งข้อมูลไป Meta)",
    },
    {
      title: "เชื่อมต่อ Supabase ได้",
      ok: reachable,
      help: "เช็กว่าที่อยู่และ key ตรงกับโปรเจกต์เดียวกัน แล้วปิดเปิดระบบใหม่ (หยุด แล้วรัน npm run dev อีกครั้ง)",
    },
    {
      title: "เปิดล็อกอินด้วย Google แล้ว",
      ok: googleOn,
      help: "ทำตามคู่มือ docs/guides/google-login.md: สร้าง OAuth client ใน Google Cloud แล้วนำ Client ID กับ Client Secret ไปใส่ที่ Supabase > Authentication > Sign In / Providers > Google",
    },
    {
      title: "สร้างตารางในฐานข้อมูลแล้ว",
      ok: tablesOk,
      help: "รันไฟล์ในโฟลเดอร์ supabase/migrations ทีละไฟล์ ตามลำดับเลข (0001 ถึง 0006) ที่หน้า SQL Editor ของ Supabase",
    },
  ];
}

export default async function SetupPage() {
  const checks = await runChecks();
  const done = checks.filter((c) => c.ok).length;
  const allOk = done === checks.length;
  /** The first check that has not passed: the step to do next. */
  const firstTodo = checks.findIndex((c) => !c.ok);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 p-4 py-8">
      <header>
        <p className="text-sm text-ink-soft">{APP.name}</p>
        <h1 className="text-xl font-semibold">เช็กการติดตั้ง</h1>
        <p className="mt-1 text-sm text-ink-soft">
          ผ่านแล้ว {done} จาก {checks.length} ข้อ
        </p>
      </header>

      <SetupSteps ariaLabel="ขั้นตอนการติดตั้ง">
        {checks.map((c, i) => (
          <SetupStep key={c.title} n={i + 1} title={c.title} done={c.ok} current={i === firstTodo}>
            {!c.ok && c.help}
          </SetupStep>
        ))}
      </SetupSteps>

      {allOk ? (
        <Link
          href="/login"
          className="flex min-h-11 items-center justify-center rounded-control bg-brand px-4 font-medium text-brand-ink"
        >
          ไปหน้าเข้าสู่ระบบ
        </Link>
      ) : (
        <p className="text-sm text-ink-soft">แก้ข้อที่ยังไม่ผ่าน แล้วรีเฟรชหน้านี้</p>
      )}
    </main>
  );
}
