-- 0017 Sales performance per person for the ทีมขาย page: what happened IN the chosen days
-- (not the cohort of leads created in them), plus where each person stands right now.
-- Counted per lead (a lead moved to จอง twice counts once). Run after 0016.

create function public.sales_performance(p_project uuid default null, p_from date default null, p_to date default null)
returns table (
  owner_id uuid, owner_name text, avatar_url text,
  open_now bigint,        -- customers still in progress, right now
  overdue_now bigint,     -- follow-up date already passed, right now
  due_today bigint,       -- follow-up date is today
  new_leads bigint,       -- leads created in the days
  contacted bigint,       -- customers talked to (any activity) in the days
  appointments bigint,    -- moved to นัดชม in the days
  visits bigint,          -- moved to มาชมแล้ว in the days
  closed bigint,          -- moved to จอง in the days
  transfers bigint,       -- moved to โอน in the days
  lost bigint             -- moved to ไม่ซื้อ in the days
)
language sql stable security invoker set search_path = '' as $$
  with rng as (
    select coalesce(p_from, public.today_th()) as d1, coalesce(p_to, public.today_th()) as d2
  ),
  l as (
    select x.* from public.leads x where (p_project is null or x.project_id = p_project)
  ),
  moves as (
    select h.lead_id, h.to_stage, l.owner_id from public.stage_history h join l on l.id = h.lead_id, rng
    where (h.changed_at at time zone 'Asia/Bangkok')::date between rng.d1 and rng.d2
  ),
  acts as (
    select a.lead_id, l.owner_id from public.activities a join l on l.id = a.lead_id, rng
    where (a.created_at at time zone 'Asia/Bangkok')::date between rng.d1 and rng.d2
  )
  select p.id, p.full_name, p.avatar_url,
    (select count(*) from l where l.owner_id = p.id and public.is_open_stage(l.stage)),
    (select count(*) from l where l.owner_id = p.id and public.is_open_stage(l.stage) and l.next_follow_up < public.today_th()),
    (select count(*) from l where l.owner_id = p.id and public.is_open_stage(l.stage) and l.next_follow_up = public.today_th()),
    (select count(*) from l, rng where l.owner_id = p.id and (l.created_at at time zone 'Asia/Bangkok')::date between rng.d1 and rng.d2),
    (select count(distinct lead_id) from acts where acts.owner_id = p.id),
    (select count(distinct lead_id) from moves where moves.owner_id = p.id and to_stage = 'appointment'),
    (select count(distinct lead_id) from moves where moves.owner_id = p.id and to_stage = 'visited'),
    (select count(distinct lead_id) from moves where moves.owner_id = p.id and to_stage = 'reserved'),
    (select count(distinct lead_id) from moves where moves.owner_id = p.id and to_stage = 'transferred'),
    (select count(distinct lead_id) from moves where moves.owner_id = p.id and to_stage = 'lost')
  from public.profiles p
  where p.role = 'sales' and p.status = 'active'
  order by p.full_name
$$;

revoke execute on function public.sales_performance(uuid, date, date) from public, anon;
grant execute on function public.sales_performance(uuid, date, date) to authenticated, service_role;
