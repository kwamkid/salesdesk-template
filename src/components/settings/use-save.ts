"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/app/(app)/settings/actions";

/** Runs a settings Server Action and keeps its result message for a <Notice>. */
export function useSave() {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [busy, start] = useTransition();
  const run = (fn: () => Promise<ActionResult>, after?: (r: ActionResult) => void) =>
    start(async () => {
      const r = await fn();
      setResult(r);
      after?.(r);
    });
  return { result, busy, run, clear: () => setResult(null) };
}
