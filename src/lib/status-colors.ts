// Status colour registry (one place for every status colour in the app). Central template:
// aoo-techstack/ui/templates/status-tabs.tsx — keep the colours in sync. Used by StatusTabs and the dashboard
// (server code can import this file; status-tabs.tsx is a client file).

export interface StatusTabColor {
  active: string;
  inactive: string;
  labelColor: string;
  countColor: string;
}

// คลาสเต็มเป็นตัวอักษรตรง ๆ — Tailwind ต้องเห็นในไฟล์ (ห้ามประกอบสตริง)
export const STATUS_TAB_COLORS: Record<string, StatusTabColor> = {
  // ทั้งหมด
  all: {
    active: "bg-slate-800",
    inactive: "bg-slate-200 dark:bg-slate-800/60",
    labelColor: "text-slate-700 dark:text-slate-300",
    countColor: "text-slate-900 dark:text-slate-100",
  },
  // ใหม่ / แบบร่าง
  new: {
    active: "bg-blue-600",
    inactive: "bg-blue-100 dark:bg-blue-950/60",
    labelColor: "text-blue-700 dark:text-blue-400",
    countColor: "text-blue-800 dark:text-blue-200",
  },
  draft: {
    active: "bg-blue-600",
    inactive: "bg-blue-100 dark:bg-blue-950/60",
    labelColor: "text-blue-700 dark:text-blue-400",
    countColor: "text-blue-800 dark:text-blue-200",
  },
  // รอคอนเฟิร์ม / รอกดรับ / รอยืนยัน
  ready_to_ship: {
    active: "bg-[#c1502f]",
    inactive: "bg-[#fadbd0] dark:bg-[#432116]",
    labelColor: "text-[#c1502f] dark:text-[#e2907a]",
    countColor: "text-[#a64b2a] dark:text-[#e2725b]",
  },
  pending_confirm: {
    active: "bg-[#c1502f]",
    inactive: "bg-[#fadbd0] dark:bg-[#432116]",
    labelColor: "text-[#c1502f] dark:text-[#e2907a]",
    countColor: "text-[#a64b2a] dark:text-[#e2725b]",
  },
  received: {
    active: "bg-[#c1502f]",
    inactive: "bg-[#fadbd0] dark:bg-[#432116]",
    labelColor: "text-[#c1502f] dark:text-[#e2907a]",
    countColor: "text-[#a64b2a] dark:text-[#e2725b]",
  }, // consignment "รอยืนยัน"
  // ที่ต้องจัดส่ง
  processing: {
    active: "bg-violet-600",
    inactive: "bg-violet-100 dark:bg-violet-950/60",
    labelColor: "text-violet-700 dark:text-violet-400",
    countColor: "text-violet-800 dark:text-violet-200",
  },
  pending: {
    active: "bg-violet-600",
    inactive: "bg-violet-100 dark:bg-violet-950/60",
    labelColor: "text-violet-700 dark:text-violet-400",
    countColor: "text-violet-800 dark:text-violet-200",
  }, // replenishment "ที่ต้องจัดส่ง"
  // กำลังส่ง
  shipping: {
    active: "bg-cyan-600",
    inactive: "bg-cyan-100 dark:bg-cyan-950/60",
    labelColor: "text-cyan-700 dark:text-cyan-400",
    countColor: "text-cyan-800 dark:text-cyan-300",
  },
  shipped: {
    active: "bg-cyan-600",
    inactive: "bg-cyan-100 dark:bg-cyan-950/60",
    labelColor: "text-cyan-700 dark:text-cyan-400",
    countColor: "text-cyan-800 dark:text-cyan-300",
  },
  // สำเร็จ / ชำระแล้ว / รับแล้ว / ยืนยันแล้ว
  completed: {
    active: "bg-emerald-600",
    inactive: "bg-emerald-100 dark:bg-emerald-950/60",
    labelColor: "text-emerald-700 dark:text-emerald-400",
    countColor: "text-emerald-800 dark:text-emerald-200",
  },
  paid: {
    active: "bg-emerald-600",
    inactive: "bg-emerald-100 dark:bg-emerald-950/60",
    labelColor: "text-emerald-700 dark:text-emerald-400",
    countColor: "text-emerald-800 dark:text-emerald-200",
  },
  confirmed: {
    active: "bg-emerald-600",
    inactive: "bg-emerald-100 dark:bg-emerald-950/60",
    labelColor: "text-emerald-700 dark:text-emerald-400",
    countColor: "text-emerald-800 dark:text-emerald-200",
  },
  // วางบิลแล้ว / รอชำระ (statements)
  billed: {
    active: "bg-blue-600",
    inactive: "bg-blue-100 dark:bg-blue-950/60",
    labelColor: "text-blue-700 dark:text-blue-400",
    countColor: "text-blue-800 dark:text-blue-200",
  },
  sent: {
    active: "bg-blue-600",
    inactive: "bg-blue-100 dark:bg-blue-950/60",
    labelColor: "text-blue-700 dark:text-blue-400",
    countColor: "text-blue-800 dark:text-blue-200",
  },
  invoiced: {
    active: "bg-blue-600",
    inactive: "bg-blue-100 dark:bg-blue-950/60",
    labelColor: "text-blue-700 dark:text-blue-400",
    countColor: "text-blue-800 dark:text-blue-200",
  },
  // ชำระบางส่วน
  partially_paid: {
    active: "bg-amber-500",
    inactive: "bg-amber-100 dark:bg-amber-950/60",
    labelColor: "text-amber-700 dark:text-amber-400",
    countColor: "text-amber-800 dark:text-amber-200",
  },
  // เกินกำหนด
  overdue: {
    active: "bg-red-500",
    inactive: "bg-red-100 dark:bg-red-950/60",
    labelColor: "text-red-700 dark:text-red-400",
    countColor: "text-red-600 dark:text-red-300",
  },
  // ยกเลิก
  cancelled: {
    active: "bg-gray-500",
    inactive: "bg-gray-200 dark:bg-gray-800",
    labelColor: "text-gray-700 dark:text-gray-400",
    countColor: "text-gray-700 dark:text-gray-200",
  },
  // รับครบ / partial (replenishment)
  partial_received: {
    active: "bg-emerald-600",
    inactive: "bg-emerald-100 dark:bg-emerald-950/60",
    labelColor: "text-emerald-700 dark:text-emerald-400",
    countColor: "text-emerald-800 dark:text-emerald-200",
  },
};

/** Status → colour key. Lead stages run blue → terracotta → violet → cyan → amber → green; closed = grey. */
export const STATUS_KEY_ALIASES: Record<string, string> = {
  // lead stages
  qualified: "pending_confirm",
  appointment: "processing",
  visited: "shipping",
  reserved: "partially_paid",
  contracted: "paid",
  transferred: "completed",
  lost: "cancelled",
  unqualified: "cancelled",
  // general
  active: "completed",
  inactive: "cancelled",
  disabled: "cancelled",
  scheduled: "new",
  expired: "overdue",
  available: "completed",
  sold: "cancelled",
};

/** Colour of a status key. Unknown = grey. */
export function getTabColor(key: string): StatusTabColor {
  return (
    STATUS_TAB_COLORS[STATUS_KEY_ALIASES[key] || key] ||
    STATUS_TAB_COLORS.cancelled
  );
}
