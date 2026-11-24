import type { StageKey } from "@/config/stages";

/** Stages that have a value and a Meta event (lost / unqualified do not). Plain module so the
 *  Server Component and the client form can both import it. */
export const EVENT_STAGES: StageKey[] = ["new", "qualified", "appointment", "visited", "reserved", "contracted", "transferred"];

/** Same names as default_event_name() in 0012_meta_standard_event_names.sql: Meta standard
 *  events, so each stage has its own column in Ads Manager. */
export const DEFAULT_EVENT: Record<string, string> = {
  new: "Lead",
  qualified: "SubmitApplication",
  appointment: "Schedule",
  visited: "Contact",
  reserved: "InitiateCheckout",
  contracted: "AddPaymentInfo",
  transferred: "Purchase",
};
