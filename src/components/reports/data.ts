// Server-side loaders for the dashboard, team and reports pages. Each page makes one RPC call
// for its numbers; the project and sales lists only fill the filter dropdowns.

import { createClient } from "@/lib/supabase/server";
import type { Filters } from "./params";

export type Option = { id: string; name: string };

export type TeamRow = {
  owner_id: string;
  owner_name: string;
  leads_open: number;
  leads_in_range: number;
  activities: number;
  activities_per_week: number | null;
  avg_hours_to_first_contact: number | null;
  overdue: number;
  appointments: number;
  visits: number;
  reservations: number;
  lost: number;
  top_lost_reason: string | null;
};

export type Dashboard = {
  from: string;
  to: string;
  kpi: { new_leads: number; appointments: number; reservations: number; transfers: number; overdue: number };
  funnel: { stage: string; count: number }[] | null;
  current: Record<string, number>;
  by_project: {
    id: string;
    name: string;
    leads: number;
    appointments: number;
    reservations: number;
    transfers: number;
    sold_value: number;
    units_left: number;
    value_left: number;
  }[];
  by_campaign: { name: string; leads: number; qualified: number; visited: number; reserved: number }[];
  lost_reasons: { label: string; count: number }[];
  by_sales: TeamRow[];
};

/** Projects the signed-in user can see (RLS decides). */
export async function loadProjects(): Promise<Option[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("id, name").order("name");
  return (data ?? []) as Option[];
}

/** Sales people for the owner filter (admin and executive can read every profile). */
export async function loadSales(): Promise<Option[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "sales")
    .order("full_name");
  return (data ?? []).map((p) => ({ id: p.id as string, name: (p.full_name as string) || "-" }));
}

const rangeArgs = (f: Filters) => ({ p_project: f.project, p_from: f.from, p_to: f.to });

export async function loadDashboard(f: Filters): Promise<Dashboard | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dashboard", rangeArgs(f));
  if (error || !data) return null;
  return data as Dashboard;
}

export async function loadTeam(f: Filters): Promise<TeamRow[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("team_summary", rangeArgs(f));
  if (error) return null;
  return (data ?? []) as TeamRow[];
}
