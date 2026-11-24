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

export const STAGES: { key: StageKey; label: string; tone: StageTone; open: boolean; hint: string }[] = [
  { key: "new", label: "ลีดใหม่", tone: "neutral", open: true, hint: "เพิ่งได้ชื่อกับเบอร์ ยังไม่ได้คุยกันจริง" },
  { key: "qualified", label: "ลีดคุณภาพ", tone: "brand", open: true, hint: "คุยแล้ว สนใจจริง และงบถึง" },
  { key: "appointment", label: "นัดชมโครงการ", tone: "warn", open: true, hint: "มีวันนัดมาดูโครงการแล้ว" },
  { key: "visited", label: "มาชมแล้ว", tone: "warn", open: true, hint: "มาดูโครงการแล้ว (เช็กอินหน้างาน)" },
  { key: "reserved", label: "จอง", tone: "ok", open: true, hint: "วางเงินจองแล้ว" },
  { key: "contracted", label: "ทำสัญญา", tone: "ok", open: true, hint: "เซ็นสัญญาจะซื้อจะขายแล้ว" },
  { key: "transferred", label: "โอน", tone: "ok", open: false, hint: "โอนกรรมสิทธิ์แล้ว ปิดการขาย" },
  { key: "lost", label: "ไม่ซื้อ", tone: "danger", open: false, hint: "คุยแล้วแต่ไม่ซื้อ (มีเหตุผลกำกับ)" },
  { key: "unqualified", label: "ไม่มีคุณภาพ", tone: "danger", open: false, hint: "เบอร์ผิด ไม่สนใจ หรืองบไม่ถึง" },
];

export const stageOf = (key: string) => STAGES.find((s) => s.key === key) ?? STAGES[0];

/** A lead that is still open must always have a next follow-up date. */
export const isOpenStage = (key: string) => stageOf(key).open;
