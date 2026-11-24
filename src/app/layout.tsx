import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import Script from "next/script";
import { APP } from "@/config/app";
import "./globals.css";

const font = IBM_Plex_Sans_Thai({
  variable: "--font-app",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: APP.name, template: `%s · ${APP.name}` },
  description: APP.description,
  // Home-screen app on iPhone (the manifest in manifest.ts covers Android and desktop).
  appleWebApp: { capable: true, title: APP.shortName, statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/** Runs before the first paint: applies the saved light/dark mode and the collapsed sidebar,
 *  so neither flashes. Keys are shared with src/components/shell/theme-toggle.tsx and sidebar.tsx. */
const PRE_PAINT = `(function(){try{var d=document.documentElement;var t=localStorage.getItem("sd-theme")||"system";
var dark=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);
d.setAttribute("data-theme",dark?"dark":"light");
if(localStorage.getItem("sd-sidebar-collapsed")==="1")d.setAttribute("data-sidebar","collapsed");}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" data-theme="light" className={`${font.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full">
        {children}
        {/* Theme + sidebar state before the first paint (no flash). Next injects it into the initial HTML. */}
        <Script id="pre-paint" strategy="beforeInteractive">
          {PRE_PAINT}
        </Script>
      </body>
    </html>
  );
}
