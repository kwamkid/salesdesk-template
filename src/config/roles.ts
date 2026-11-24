export type Role = "admin" | "executive" | "sales";

export const ROLE_LABEL: Record<Role, string> = {
  admin: "แอดมิน",
  executive: "ผู้บริหาร",
  sales: "เซลส์",
};

export const ROLES: Role[] = ["admin", "executive", "sales"];

/** First page each role sees after signing in. */
export const HOME: Record<Role, string> = {
  admin: "/queue",
  executive: "/overview",
  sales: "/today",
};

/** `group` (optional): a heading shown above this item in the left menu when it differs from the item before. */
export type MenuItem = { href: string; label: string; icon: IconName; primary?: boolean; group?: string };
export type IconName = "today" | "people" | "plus" | "map" | "me" | "chart" | "building" | "team" | "file" | "inbox" | "gear";

/** Bottom bar on phones (5 buttons at most), left menu on large screens. */
export const MENU: Record<Role, MenuItem[]> = {
  sales: [
    { href: "/today", label: "วันนี้", icon: "today" },
    { href: "/leads", label: "ลูกค้า", icon: "people" },
    { href: "/leads/new", label: "เพิ่มลีด", icon: "plus", primary: true },
    { href: "/plots", label: "แปลง", icon: "map" },
    { href: "/me", label: "ฉัน", icon: "me" },
  ],
  executive: [
    { href: "/overview", label: "ภาพรวม", icon: "chart" },
    { href: "/projects", label: "โครงการ", icon: "building" },
    { href: "/team", label: "ทีมขาย", icon: "team" },
    { href: "/leads", label: "ลูกค้า", icon: "people" },
    { href: "/reports", label: "รายงาน", icon: "file" },
  ],
  admin: [
    { href: "/queue", label: "งานรอ", icon: "inbox" },
    { href: "/users", label: "ผู้ใช้", icon: "people" },
    { href: "/projects", label: "โครงการ", icon: "building" },
    { href: "/reports", label: "รายงาน", icon: "file" },
    { href: "/settings", label: "ตั้งค่า", icon: "gear" },
  ],
};
