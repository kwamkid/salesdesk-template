import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnv, SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

// Pages anyone can open without signing in.
const PUBLIC = ["/setup", "/theme", "/login", "/invite", "/auth", "/api/cron", "/api/leads"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Before .env.local is filled in, every page leads to the setup checklist.
  if (!hasSupabaseEnv) {
    if (pathname.startsWith("/setup") || pathname.startsWith("/theme")) return NextResponse.next();
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  // Refreshes the session cookie when it is about to expire.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!signedIn && !isPublic) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  // Skip static files, images and the PWA files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|icons/|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
