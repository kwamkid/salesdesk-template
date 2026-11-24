// Activity types and loan screening statuses. Keys are stored in the database.

export type ActivityType = "call" | "chat" | "meeting" | "visit" | "other";

export const ACTIVITY_TYPES: { key: ActivityType; label: string }[] = [
  { key: "call", label: "โทร" },
  { key: "chat", label: "แชต" },
  { key: "meeting", label: "นัดคุย" },
  { key: "visit", label: "พาชม" },
  { key: "other", label: "อื่นๆ" },
];

export const activityLabel = (key: string) => ACTIVITY_TYPES.find((a) => a.key === key)?.label ?? key;

export type LoanStatus = "not_screened" | "waiting_docs" | "submitted" | "approved" | "rejected";

export const LOAN_STATUS: { key: LoanStatus; label: string; tone: "neutral" | "warn" | "brand" | "ok" | "danger" }[] = [
  { key: "not_screened", label: "ยังไม่คัดกรอง", tone: "neutral" },
  { key: "waiting_docs", label: "รอเอกสาร", tone: "warn" },
  { key: "submitted", label: "ยื่นแล้ว", tone: "brand" },
  { key: "approved", label: "ผ่าน", tone: "ok" },
  { key: "rejected", label: "ไม่ผ่าน", tone: "danger" },
];
