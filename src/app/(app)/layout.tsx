import Image from "next/image";
import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Sidebar } from "@/components/shell/sidebar";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { APP } from "@/config/app";
import { HOME, MENU, ROLE_LABEL } from "@/config/roles";
import { Avatar } from "@/components/ui/avatar";
import { requireMe } from "@/lib/auth";

/** Shell for every page behind the login, laid out like aoocommerce:
 *  left menu (sticky, full height) | sticky top bar + content. Phones get a bottom bar instead of the left menu. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const me = await requireMe();
  const name = me.full_name || me.email;
  // requireMe() does not read the picture; one small extra read for the header chip.

  return (
    <div className="flex min-h-dvh bg-bg">
      <Sidebar items={MENU[me.role]} homeHref={HOME[me.role]} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar — h-16 so its bottom line meets the sidebar's logo row. The page title lives in the page (PageTitle). */}
        <header className="sticky top-0 z-30 border-b border-line bg-header pt-[env(safe-area-inset-top)]">
          <div className="flex h-16 items-center justify-between gap-2 px-3 sm:px-4 md:justify-end md:px-6">
            {/* Phones: logo + name (no sidebar there) */}
            <Link href={HOME[me.role]} className="flex min-h-11 min-w-0 items-center gap-2 font-bold md:hidden">
              <Image src={APP.logo} alt={`โลโก้ ${APP.name}`} width={32} height={32} className="h-8 w-8 shrink-0" priority />
              <span className="truncate text-lg">{APP.name}</span>
            </Link>

            <div className="flex shrink-0 items-center gap-1 md:gap-2">
              <ThemeToggle />
              <NotificationBell userId={me.id} />
              <Link
                href="/me"
                aria-label={`บัญชีของฉัน ${name} (${ROLE_LABEL[me.role]})`}
                className="flex min-h-11 items-center gap-2 rounded-control px-1.5 text-ink transition-colors hover:bg-sidebar-hover md:px-2"
              >
                <Avatar name={name} url={me.avatar_url} size="md" />
                <span aria-hidden className="hidden max-w-40 truncate text-sm font-medium lg:block">
                  {name}
                </span>
                <span aria-hidden className="rounded-full bg-bg px-2 py-0.5 text-xs font-medium text-ink-soft">
                  {ROLE_LABEL[me.role]}
                </span>
              </Link>
            </div>
          </div>
        </header>

        {/* Full width of the area beside the sidebar, aoocommerce padding. pb-24 keeps content clear of the bottom bar on phones.
            A page that reads better narrow wraps itself in <Container size="2xl"> (src/components/ui/container.tsx). */}
        <main className="flex w-full min-w-0 flex-1 flex-col gap-6 px-2 pt-3 pb-24 sm:px-4 sm:pt-4 md:px-6 md:pt-6 md:pb-6">
          {children}
        </main>
      </div>

      <AppNav items={MENU[me.role]} />
    </div>
  );
}
