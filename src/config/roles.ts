export type Role = "admin" | "executive" | "sales";

export const ROLE_LABEL: Record<Role, string> = {
  admin: "แอดมิน",
  executive: "ผู้บริหาร",
  sales: "เซลส์",
};

export const ROLES: Role[] = ["admin", "executive", "sales"];

/** First page each role sees after signing in. */
export const HOME: Record<Role, string> = {
  admin: "/overview",
  executive: "/overview",
  sales: "/today",
};

/** `group` (optional): a heading shown above this item in the left menu when it differs from the item before.
 *  `bar` (optional): when a role has more than 5 items, only items with `bar` sit in the phone's bottom bar
 *  (4 at most); the rest open from its "เมนู" button. */
export type MenuItem = {
  href: string;
  label: string;
  icon: IconName;
  primary?: boolean;
  group?: string;
  bar?: boolean;
  /** Left menu: pinned to the bottom (sticky footer), like aoo apps. */
  bottom?: boolean;
  /** Other pages that light up this item (pages moved out of the menu, e.g. /users under ตั้งค่า). */
  also?: string[];
};
export type IconName =
  | "today"
  | "people"
  | "plus"
  | "map"
  | "me"
  | "chart"
  | "building"
  | "team"
  | "file"
  | "inbox"
  | "gear"
  | "users";

/** Left menu on large screens. Phones: bottom bar (5 buttons at most, see `bar`). */
export const MENU: Record<Role, MenuItem[]> = {
  // Kept as small as possible: follow your leads by stage ("เพิ่มลีด" is the button on the ลูกค้า page). One-off setup lives in ตั้งค่า.
  // "ฉัน" (/me) opens from the profile picture in the top bar.
  sales: [
    { href: "/today", label: "ตามลูกค้า", icon: "today" },
    { href: "/leads", label: "ลูกค้า", icon: "people" },
  ],
  executive: [
    { href: "/overview", label: "ภาพรวม", icon: "chart" },
    { href: "/today", label: "ตามลูกค้า", icon: "today" },
    { href: "/team", label: "ทีมขาย", icon: "team" },
    {
      href: "/leads",
      label: "ลูกค้า",
      icon: "people",
      also: ["/plots", "/projects"],
    },
    { href: "/reports", label: "รายงาน", icon: "file" },
  ],
  admin: [
    { href: "/overview", label: "ภาพรวม", icon: "chart" },
    { href: "/today", label: "ตามลูกค้า", icon: "today" },
    { href: "/team", label: "ทีมขาย", icon: "team" },
    { href: "/leads", label: "ลูกค้า", icon: "people" },
    { href: "/reports", label: "รายงาน", icon: "file" },
    {
      href: "/settings",
      label: "ตั้งค่า",
      icon: "gear",
      bottom: true,
      also: ["/users", "/projects", "/queue", "/plots"],
    },
  ],
};
