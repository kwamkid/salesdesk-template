"use client";

/* Central template: aoo-techstack/ui/templates/tabs.tsx (copied; keep in sync).
 * Tabs — แท็บเนื้อหา (segmented control) (aoo-techstack/ui/LAYOUT-PARTS.md)
 * ต้นทาง: aoocommerce `components/ui/Tabs.tsx` (+ `lib/useTabHash.ts` ฝังในไฟล์)
 *
 * รางพื้นเทามุมมน แท็บที่เลือกเป็นการ์ดขาวเงานุ่มลอยในราง · ใช้สลับแผง/มุมมองในหน้า
 *  - 2 โหมด: `href` ต่อแท็บ = <Link> (route) · `onSelect` = state ของผู้เรียก (มีทั้งคู่ได้ onSelect ยิงก่อน)
 *  - จอแคบ + แท็บเกิน `mobileDropdownFrom` (3) = กลายเป็น FormSelect (สลับด้วย CSS ไม่ใช่ JS → ไม่ hydration mismatch)
 *  - `hash` = จำแท็บใน URL `#key` (ลิงก์เปิดแท็บนั้นได้ · Back ย้อนแท็บ) — แถบเดียวต่อหน้า ต้องมี onSelect
 *  - `variant="pill"` = หัวแผง ไม่มีราง · ⛔ ห้ามทำ active เป็นเส้นใต้/เส้นขอบด้านเดียว (เจ้าของไม่เอา)
 *  - ความสูง md: แท็บ 34px + ราง p-1 = 42px เท่าช่องกรอก/ปุ่มที่วางข้างกัน
 *  - แท็บกรองสถานะของหน้า list (ตัวเลขใหญ่) ไม่ใช่ตัวนี้ → ./status-tabs.tsx
 * deps: next/link · next/navigation · ./form-select · ./tooltip
 */

import { startNav } from "@/components/shell/nav-progress";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { FormSelect } from "./form-select";
import { Tooltip } from "./tooltip";

export interface TabItem {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  /** ตัวเลขเล็กขวาป้าย */
  count?: number;
  /** มีค่า = render เป็น <Link> */
  href?: string;
  /** สีตัวอักษรของแท็บที่เลือก (ปกติสีเข้ม) เช่นสีแบรนด์ของช่องทาง */
  activeColorClass?: string;
  hidden?: boolean;
  /** แสดงแต่ไอคอน — ป้ายไปอยู่ใน Tooltip / screen reader */
  iconOnly?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeKey: string;
  onSelect?: (key: string) => void;
  /** ผสานต่อท้ายคลาสฐาน (ใช้กับระยะห่าง) — ส่ง m*-… แล้ว mb-6 ปกติถอยให้ */
  className?: string;
  /** แบ่งความกว้างเท่ากันเต็มแถว (แถบสลับมุมมองบนมือถือ) */
  fill?: boolean;
  size?: "sm" | "md";
  /** จอแคบ + แท็บเกินจำนวนนี้ = dropdown · 0 = ไม่เปลี่ยน */
  mobileDropdownFrom?: number;
  iconPosition?: "left" | "top";
  variant?: "segmented" | "pill";
  /** จำแท็บใน URL `#key` */
  hash?: boolean;
  /** subtitle ของแถวใน dropdown มือถือ */
  countLabel?: (count: number) => string;
}

/** แท็บที่เปิดอยู่ใน URL `#key` — เขียนเมื่อเปลี่ยนเท่านั้น (หน้าแท็บแรก URL สะอาด) */
function useTabHash(
  active: string,
  onChange: ((key: string) => void) | undefined,
  keys: string[],
  enabled: boolean,
) {
  const changeRef = useRef(onChange);
  const activeRef = useRef(active);
  const written = useRef(active);
  const keyList = keys.join("|");
  useEffect(() => {
    changeRef.current = onChange;
    activeRef.current = active;
  });

  useEffect(() => {
    if (!enabled) return;
    const known = keyList.split("|");
    const read = () => {
      const key = decodeURIComponent(window.location.hash.slice(1));
      if (key && known.includes(key) && key !== activeRef.current) {
        written.current = key;
        changeRef.current?.(key);
      }
    };
    read();
    window.addEventListener("hashchange", read);
    window.addEventListener("popstate", read);
    return () => {
      window.removeEventListener("hashchange", read);
      window.removeEventListener("popstate", read);
    };
  }, [enabled, keyList]);

  useEffect(() => {
    if (!enabled || active === written.current) return;
    written.current = active;
    if (decodeURIComponent(window.location.hash.slice(1)) !== active)
      window.history.pushState(null, "", `#${encodeURIComponent(active)}`);
  }, [enabled, active]);
}

export function Tabs({
  tabs,
  activeKey,
  onSelect,
  className,
  fill,
  size = "md",
  mobileDropdownFrom = 3,
  iconPosition = "left",
  variant = "segmented",
  hash = false,
  countLabel = (n) => `${n} รายการ`,
}: TabsProps) {
  const pill = variant === "pill";
  const visible = tabs.filter((t) => !t.hidden);
  useTabHash(
    activeKey,
    onSelect,
    visible.map((t) => t.key),
    hash,
  );
  const router = useRouter();
  // Tailwind ตัดสินคลาสที่ชนจากลำดับใน CSS ไม่ใช่ในสตริง — ผู้เรียกส่ง mb-0 แพ้ mb-6 ที่ฝังไว้ → ถอย mb-6 เมื่อมี m*-
  const hasOwnMargin = /(^|\s)!?m[byt]?-/.test(className || "");
  // dark rail = black/30 + ring — slate-800 เดิมเท่าพื้นการ์ด รางหายบนการ์ด
  const baseCls = (display: string) =>
    pill
      ? `${display} items-center gap-1 overflow-x-auto ${fill ? "w-full" : "w-fit max-w-full"}`
      : `${display} gap-1 overflow-x-auto rounded-xl bg-gray-200/60 p-1 dark:bg-black/30 dark:ring-1 dark:ring-inset dark:ring-slate-700 ${hasOwnMargin ? "" : "mb-6"} ${fill ? "w-full" : "w-fit max-w-full"}`;
  const asDropdown =
    mobileDropdownFrom > 0 && visible.length > mobileDropdownFrom;

  return (
    <>
      {asDropdown && (
        <div
          className={`sm:hidden ${hasOwnMargin ? "" : "mb-4"} ${className || ""}`}
        >
          <FormSelect
            value={activeKey}
            onChange={(key) => {
              onSelect?.(key);
              const target = visible.find((t) => t.key === key);
              if (target?.href) {
                startNav();
                router.push(target.href);
              }
            }}
            options={visible.map((t) => ({
              id: t.key,
              label: typeof t.label === "string" ? t.label : String(t.key),
              icon: t.icon,
              subtitle:
                typeof t.count === "number" ? countLabel(t.count) : undefined,
            }))}
          />
        </div>
      )}
      <div
        className={`${baseCls(asDropdown ? "hidden sm:flex" : "flex")} ${className || ""}`}
      >
        {visible.map((tab) => {
          const isActive = tab.key === activeKey;
          const stacked = iconPosition === "top";
          const sizeCls = stacked
            ? size === "sm"
              ? "gap-1.5 rounded-md px-3 py-2 text-xs"
              : "gap-2 rounded-lg px-4 py-2.5 text-sm"
            : size === "sm"
              ? "h-7 gap-1.5 rounded-md px-3 text-xs"
              : "h-[34px] gap-2 rounded-lg px-4 text-base";
          const fillCls = fill ? "flex-1" : "";
          // แท็บที่เลือกหนากว่านิดเดียวพอ — semibold ทั้งแถบหนักตา
          const cls = pill
            ? `flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 transition-colors ${size === "sm" ? "text-sm" : "text-base"} ${fillCls} ${
                isActive
                  ? `bg-[color-mix(in_srgb,var(--ui-accent,#f59e0b)_10%,transparent)] font-medium ${tab.activeColorClass ?? "text-[var(--ui-accent,#f59e0b)]"}`
                  : "font-normal text-slate-500 hover:bg-gray-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              }`
            : `flex ${stacked ? "flex-col" : ""} items-center justify-center whitespace-nowrap transition-all ${sizeCls} ${fillCls} ${
                isActive
                  ? `bg-white font-medium shadow-[0_1px_4px_rgba(15,23,42,0.12)] dark:bg-slate-600 dark:shadow-[0_1px_4px_rgba(0,0,0,0.5)] ${tab.activeColorClass ?? "text-gray-900 dark:text-white"}`
                  : "font-normal text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`;

          const inner = (
            <>
              {tab.icon && (
                <span className="flex flex-shrink-0 items-center leading-none [&>img]:block [&>svg]:block">
                  {tab.icon}
                </span>
              )}
              <span className={tab.iconOnly && tab.icon ? "sr-only" : ""}>
                {tab.label}
              </span>
              {typeof tab.count === "number" && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs ${
                    isActive
                      ? "bg-[color-mix(in_srgb,var(--ui-accent,#f59e0b)_10%,transparent)] text-[var(--ui-accent,#f59e0b)]"
                      : "bg-white/70 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </>
          );

          const tip =
            tab.iconOnly && typeof tab.label === "string" ? tab.label : "";
          return (
            <Tooltip key={tab.key} text={tip}>
              {tab.href ? (
                <Link
                  href={tab.href}
                  onClick={() => onSelect?.(tab.key)}
                  className={cls}
                  aria-current={isActive ? "page" : undefined}
                >
                  {inner}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect?.(tab.key)}
                  className={cls}
                  aria-pressed={isActive}
                >
                  {inner}
                </button>
              )}
            </Tooltip>
          );
        })}
      </div>
    </>
  );
}
