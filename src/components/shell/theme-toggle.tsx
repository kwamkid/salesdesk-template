"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { DarkThemeIcon, LightThemeIcon, SystemThemeIcon } from "@/lib/icons";

type Theme = "light" | "dark" | "system";

/** Shared with the pre-paint script in src/app/layout.tsx */
const KEY = "sd-theme";
const CYCLE: Theme[] = ["light", "dark", "system"];
const LABEL: Record<Theme, string> = { light: "สว่าง", dark: "มืด", system: "ตามเครื่อง" };
const listeners = new Set<() => void>();
let memory: Theme = "system"; // used when storage is blocked

function read(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" || v === "system" ? v : memory;
  } catch {
    return memory;
  }
}

function apply(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Light / dark / follow the device, like aoocommerce's ThemeToggle. One tap moves to the next mode. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, read, () => "system" as Theme);

  // "Follow the device": repaint when the device switches mode.
  useEffect(() => {
    if (theme !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const next = () => {
    const t = CYCLE[(CYCLE.indexOf(read()) + 1) % CYCLE.length];
    memory = t;
    try {
      localStorage.setItem(KEY, t);
    } catch {
      /* storage blocked: still switch for this visit */
    }
    apply(t);
    listeners.forEach((l) => l());
  };

  const Icon = theme === "light" ? LightThemeIcon : theme === "dark" ? DarkThemeIcon : SystemThemeIcon;
  const label = `โหมดสี: ${LABEL[theme]} (แตะเพื่อเปลี่ยน)`;

  return (
    <Tooltip text={`โหมดสี: ${LABEL[theme]}`} position="bottom">
      <button
        type="button"
        onClick={next}
        aria-label={label}
        className="flex h-11 w-11 items-center justify-center rounded-control text-ink-soft transition-colors hover:bg-sidebar-hover hover:text-ink"
      >
        <Icon className="h-5 w-5" aria-hidden />
      </button>
    </Tooltip>
  );
}
