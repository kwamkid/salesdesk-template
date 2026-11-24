import { NextResponse, type NextRequest } from "next/server";
import { originFrom } from "@/lib/origin";
import { createClient } from "@/lib/supabase/server";

// Google sends the person back here after they pick their account.
// 1. Swap the one-time code for a session cookie.
// 2. If they came from an invite link, use the invite so their role applies at once.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const site = originFrom(request.headers);
  const code = url.searchParams.get("code");
  const invite = url.searchParams.get("invite");
  const next = url.searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (!code) return NextResponse.redirect(new URL("/login?error=google", site));

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/login?error=google", site));

  if (invite) {
    const { data: used } = await supabase.rpc("redeem_invite", { p_token: invite });
    if (!used) return NextResponse.redirect(new URL("/pending?invite=invalid", site));
  }
  return NextResponse.redirect(new URL(safeNext, site));
}
