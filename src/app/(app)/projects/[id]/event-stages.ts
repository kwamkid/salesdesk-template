import type { StageKey } from "@/config/stages";

/** Stages that have a value and a Meta event (lost / unqualified do not). Plain module so the
 *  Server Component and the client form can both import it. */
export const EVENT_STAGES: StageKey[] = ["new", "qualified", "appointment", "visited", "reserved", "contracted", "transferred"];

/** Same names as default_event_name() in 0005_meta_documents_push.sql. */
export const DEFAULT_EVENT: Record<string, string> = {
  new: "Lead",
  qualified: "QualifiedLead",
  appointment: "Schedule",
  visited: "SiteVisit",
  reserved: "Reservation",
  contracted: "Contract",
  transferred: "Purchase",
};
