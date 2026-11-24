// Customer stages. The keys are stored in the database, so do not rename them.
// Labels and colors can be changed freely.

export type StageKey =
  | "new"
  | "qualified"
  | "appointment"
  | "visited"
  | "reserved"
  | "contracted"
  | "transferred"
  | "lost"
  | "unqualified";

export type StageTone = "neutral" | "brand" | "warn" | "ok" | "danger";

export const STAGES: { key: StageKey; label: string; tone: StageTone; open: boolean }[] = [
  { key: "new", label: "ลีดใหม่", tone: "neutral", open: true },
  { key: "qualified", label: "ลีดคุณภาพ", tone: "brand", open: true },
  { key: "appointment", label: "นัดชมโครงการ", tone: "warn", open: true },
  { key: "visited", label: "มาชมแล้ว", tone: "warn", open: true },
  { key: "reserved", label: "จอง", tone: "ok", open: true },
  { key: "contracted", label: "ทำสัญญา", tone: "ok", open: true },
  { key: "transferred", label: "โอน", tone: "ok", open: false },
  { key: "lost", label: "ไม่ซื้อ", tone: "danger", open: false },
  { key: "unqualified", label: "ไม่มีคุณภาพ", tone: "danger", open: false },
];

export const stageOf = (key: string) => STAGES.find((s) => s.key === key) ?? STAGES[0];

/** A lead that is still open must always have a next follow-up date. */
export const isOpenStage = (key: string) => stageOf(key).open;
