"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Loading feedback for every navigation in the app (owner's rule, 24 Nov 2569): a bar runs across the top
 * and the page content dims (globals.css, html[data-navigating]) from the tap until the new page arrives.
 * Starts by itself on: an internal link click, a GET form submit (filters, search, date range).
 * Code that moves with router.push / router.replace calls startNav() first.
 * Menu changes also show the page's loading.tsx skeleton.
 */
export function startNav() {
  document.documentElement.dataset.navigating = "1";
  window.clearTimeout(Number(document.documentElement.dataset.navTimer || 0));
  // Safety net: never leave the page dimmed if a navigation is cancelled.
  document.documentElement.dataset.navTimer = String(window.setTimeout(stopNav, 15000));
}

function stopNav() {
  delete document.documentElement.dataset.navigating;
}

export function NavProgress() {
  const pathname = usePathname();
  const params = useSearchParams();

  // A new URL has rendered: done.
  useEffect(() => {
    stopNav();
  }, [pathname, params]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // same page (or #hash)
      startNav();
    };
    const onSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement;
      if (!e.defaultPrevented && form.getAttribute("method")?.toLowerCase() === "get") startNav();
    };
    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("submit", onSubmit);
    };
  }, []);

  return <div aria-hidden className="nav-progress" />;
}
