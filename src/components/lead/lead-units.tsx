/**
 * <LeadUnits leadId projectId editable /> — drop-in for the customer page (/leads/[id], step 1.13).
 *
 * Server Component. Shows the plot this customer reserved (if any) and the plots they are
 * interested in. With `editable`, a "เลือกแปลงที่สนใจ" button opens a sheet with a searchable
 * plot dropdown (plus a "ดูบนผัง" link to /plots) and toggles interest with toggle_interest().
 *
 * Props
 *   leadId    — leads.id of the customer
 *   projectId — leads.project_id (the plots of this project are listed)
 *   editable  — true when the viewer may change this customer (sales owner or admin; false for executives).
 *               The database checks again, so a wrong value only shows buttons that fail.
 *
 * Usage:
 *   import { LeadUnits } from "@/components/lead/lead-units";
 *   <LeadUnits leadId={lead.id} projectId={lead.project_id} editable={me.role !== "executive"} />
 */
import { loadBoard } from "@/components/plots/load";
import { LeadUnitsPicker } from "@/components/plots/lead-units-picker";
import { createClient } from "@/lib/supabase/server";

export async function LeadUnits({
  leadId,
  projectId,
  editable,
}: {
  leadId: string;
  projectId: string;
  editable: boolean;
}) {
  const supabase = await createClient();
  const [units, interests] = await Promise.all([
    loadBoard(supabase, projectId),
    supabase.from("unit_interests").select("unit_id").eq("lead_id", leadId),
  ]);

  return (
    <LeadUnitsPicker
      leadId={leadId}
      projectId={projectId}
      editable={editable}
      units={units}
      initialInterestIds={(interests.data ?? []).map((i) => i.unit_id as string)}
    />
  );
}
