import Image from "next/image";
import { GoogleButton } from "@/components/google-button";
import { Card, Notice } from "@/components/ui/card";
import { APP } from "@/config/app";
import { ROLE_LABEL, type Role } from "@/config/roles";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "ลิงก์เชิญ" };

// An invite link: show what it gives, then sign in with Google. The role applies right after.
export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("invite_info", { p_token: token });
  const info = (data as { role: Role; valid: boolean }[] | null)?.[0];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 p-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <Image src={APP.logo} alt={`โลโก้ ${APP.name}`} width={56} height={56} priority />
        <h1 className="text-xl font-semibold">{APP.name}</h1>
      </div>
      <Card className="flex flex-col gap-4">
        {info?.valid ? (
          <>
            <p className="text-center">
              คุณได้รับเชิญให้ใช้งานในระดับ <span className="font-semibold">{ROLE_LABEL[info.role]}</span>
            </p>
            <GoogleButton invite={token} label="รับคำเชิญด้วย Google" />
          </>
        ) : (
          <Notice tone="danger">ลิงก์เชิญนี้ใช้ไม่ได้แล้ว (ถูกใช้ไปแล้วหรือหมดอายุ) ขอลิงก์ใหม่จากแอดมิน</Notice>
        )}
      </Card>
    </main>
  );
}
