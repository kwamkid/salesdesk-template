import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getMe } from "@/lib/auth";
import { logout } from "../actions";

export const metadata = { title: "รออนุมัติ" };

export default async function PendingPage({ searchParams }: PageProps<"/pending">) {
  const q = await searchParams;
  const me = await getMe();
  if (!me) redirect("/login");
  if (me.status === "active") redirect("/");

  const disabled = me.status === "disabled";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-4 p-4">
      <Card className="flex flex-col gap-3 text-center">
        <h1 className="text-xl font-semibold">{disabled ? "บัญชีนี้ถูกปิดสิทธิ์" : "รอแอดมินอนุมัติ"}</h1>
        <p className="text-sm text-ink-soft">
          {disabled
            ? "ติดต่อแอดมินของบริษัทถ้าต้องการกลับมาใช้งาน"
            : "เข้าสู่ระบบด้วย Google แล้ว แจ้งแอดมินของบริษัทให้อนุมัติ แล้วกดปุ่มด้านล่างเพื่อเช็กอีกครั้ง"}
        </p>
        {q.invite === "invalid" && (
          <p className="rounded-control bg-warn-soft px-3 py-2 text-sm text-warn-ink">
            ลิงก์เชิญใช้ไม่ได้ (ถูกใช้ไปแล้วหรือหมดอายุ) บัญชีของคุณจึงรอแอดมินอนุมัติแทน
          </p>
        )}
        <p className="text-sm">{me.email}</p>
        {!disabled && (
          <Link href="/" prefetch={false} className={buttonClass("primary", true)}>
            เช็กอีกครั้ง
          </Link>
        )}
        <form action={logout}>
          <Button type="submit" variant="secondary" full>
            ออกจากระบบ
          </Button>
        </form>
      </Card>
    </main>
  );
}
