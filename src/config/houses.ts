// House model categories (แบบบ้าน). The keys are the house_category enum in
// supabase/migrations/0010_house_models.sql, so do not rename them. Labels are shown everywhere.
import type { StageTone } from "./stages";

export type HouseCategory = "detached" | "semi_detached" | "townhome" | "shophouse";

export const HOUSE_CATEGORIES: { key: HouseCategory; label: string; tone: StageTone }[] = [
  { key: "detached", label: "บ้านเดี่ยว", tone: "brand" },
  { key: "semi_detached", label: "บ้านแฝด", tone: "ok" },
  { key: "townhome", label: "ทาวน์โฮม", tone: "warn" },
  { key: "shophouse", label: "อาคารพาณิชย์", tone: "neutral" },
];

export const houseCategoryOf = (key: string | null | undefined) =>
  HOUSE_CATEGORIES.find((c) => c.key === key) ?? HOUSE_CATEGORIES[0];
