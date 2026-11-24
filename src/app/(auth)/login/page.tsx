import Image from "next/image";
import { redirect } from "next/navigation";
import { GoogleButton } from "@/components/google-button";
import { Card, Notice } from "@/components/ui/card";
import { APP } from "@/config/app";
import { getMe } from "@/lib/auth";

export const metadata = { title: "เข้าสู่ระบบ" };

const ERROR: Record<string, string> = {
  google: "เข้าสู่ระบบด้วย Google ไม่สำเร็จ ลองใหม่อีกครั้ง ถ้ายังไม่ได้ แจ้งแอดมินให้เช็กการตั้งค่า Google ใน Supabase",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const q = await searchParams;
  const error = typeof q.error === "string" ? (ERROR[q.error] ?? ERROR.google) : undefined;
  const next = typeof q.next === "string" ? q.next : "/";
  if (!error && (await getMe())) redirect(next);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 p-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <Image src={APP.logo} alt={`โลโก้ ${APP.name}`} width={56} height={56} priority />
        <h1 className="text-xl font-semibold">{APP.name}</h1>
        <p className="text-sm text-ink-soft">{APP.description}</p>
      </div>

      <Card className="flex flex-col gap-4">
        {error && <Notice tone="danger">{error}</Notice>}
        <GoogleButton next={next} />
        <p className="text-sm text-ink-soft">
          ใช้บัญชี Google ของคุณ ครั้งแรกระบบจะสร้างบัญชีให้ แล้วรอแอดมินอนุมัติ ถ้าได้ลิงก์เชิญจากแอดมิน ให้เปิดลิงก์นั้นแทน
        </p>
      </Card>
    </main>
  );
}
