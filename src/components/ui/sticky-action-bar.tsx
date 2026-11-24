/**
 * <StickyActionBar> — the save bar of a long form, stuck to the bottom of the screen
 * (aoocommerce StickyActionBar.tsx). Buttons on the right: ยกเลิก → บันทึก.
 * Put it as the last child inside the <form>; a submit button in `primary` sends that form.
 *
 * <StickyActionBar hint="ยังไม่ได้บันทึก" primary={<Button type="submit">บันทึก</Button>} />
 */
import type { ReactNode } from "react";

export function StickyActionBar({
  primary,
  secondary,
  hint,
  className = "",
}: {
  /** Main button(s), e.g. <Button type="submit">บันทึก</Button> */
  primary: ReactNode;
  /** Buttons left of the main one (ยกเลิก …) */
  secondary?: ReactNode;
  /** Short status on the left (e.g. "บันทึกแล้ว") */
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`sticky bottom-0 z-20 -mx-4 mt-2 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-card sm:border ${className}`}
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 text-sm text-ink-soft">{hint}</div>
        <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
          {secondary}
          {primary}
        </div>
      </div>
    </div>
  );
}
