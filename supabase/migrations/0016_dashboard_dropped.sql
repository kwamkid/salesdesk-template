-- 0016 Dashboard funnel also shows the leads that dropped out (ไม่ซื้อ · ไม่มีคุณภาพ).
-- Same function as 0006 plus the 'dropped' key. Run after 0015.

create or replace function public.dashboard(p_project uuid default null, p_from date default null, p_to date default null)
returns jsonb
language sql stable security invoker set search_path = '' as $$
  with rng as (
    select coalesce(p_from, public.today_th() - 29) as d1, coalesce(p_to, public.today_th()) as d2
  ),
  l as (
    select x.* from public.leads x where (p_project is null or x.project_id = p_project)
  ),
  inr as (select l.* from l, rng where (l.created_at at time zone 'Asia/Bangkok')::date between rng.d1 and rng.d2),
  moves as (
    select h.*, l.project_id, l.campaign_id from public.stage_history h join l on l.id = h.lead_id, rng
    where (h.changed_at at time zone 'Asia/Bangkok')::date between rng.d1 and rng.d2
  ),
  reached as (
    select h.lead_id, h.to_stage from public.stage_history h join inr on inr.id = h.lead_id group by 1, 2
  ),
  stages as (
    select s, ord from unnest(array['new','qualified','appointment','visited','reserved','contracted','transferred']::public.lead_stage[])
      with ordinality as t(s, ord)
  )
  select jsonb_build_object(
    'from', (select d1 from rng),
    'to', (select d2 from rng),
    'kpi', jsonb_build_object(
      'new_leads', (select count(*) from inr),
      'appointments', (select count(*) from moves where to_stage = 'appointment'),
      'reservations', (select count(*) from moves where to_stage = 'reserved'),
      'transfers', (select count(*) from moves where to_stage = 'transferred'),
      'overdue', (select count(*) from l where public.is_open_stage(stage) and next_follow_up < public.today_th())
    ),
    -- leads created in the range that reached each stage (at any time)
    'funnel', (select jsonb_agg(jsonb_build_object(
        'stage', s,
        'count', (select count(distinct r.lead_id) from reached r
                   where array_position(enum_range(null::public.lead_stage), r.to_stage)
                         >= array_position(enum_range(null::public.lead_stage), stages.s)
                     and r.to_stage not in ('lost', 'unqualified'))
      ) order by ord) from stages),
    -- 0016: how the same leads ended up dropping out (current stage): ไม่ซื้อ / ไม่มีคุณภาพ
    'dropped', jsonb_build_object(
      'lost', (select count(*) from inr where stage = 'lost'),
      'unqualified', (select count(*) from inr where stage = 'unqualified')
    ),
    'current', (select coalesce(jsonb_object_agg(stage, n), '{}') from (select stage, count(*) n from l group by stage) c),
    'by_project', (select coalesce(jsonb_agg(row_to_json(x) order by x.name), '[]') from (
        select pr.id, pr.name,
          (select count(*) from inr where inr.project_id = pr.id) as leads,
          (select count(*) from moves m where m.project_id = pr.id and m.to_stage = 'appointment') as appointments,
          (select count(*) from moves m where m.project_id = pr.id and m.to_stage = 'reserved') as reservations,
          (select count(*) from moves m where m.project_id = pr.id and m.to_stage = 'transferred') as transfers,
          (select coalesce(sum(u.price), 0) from public.units u where u.project_id = pr.id
             and u.status in ('reserved', 'contracted', 'transferred')) as sold_value,
          (select count(*) from public.units u where u.project_id = pr.id and u.status in ('available', 'interested')) as units_left,
          (select coalesce(sum(u.price), 0) from public.units u where u.project_id = pr.id
             and u.status in ('available', 'interested')) as value_left
        from public.projects pr where p_project is null or pr.id = p_project) x),
    'by_campaign', (select coalesce(jsonb_agg(row_to_json(x) order by x.leads desc), '[]') from (
        select coalesce(c.name, 'ไม่ระบุแคมเปญ') as name,
          count(*) as leads,
          count(*) filter (where exists (select 1 from reached r where r.lead_id = inr.id and r.to_stage = 'qualified')) as qualified,
          count(*) filter (where inr.visited_at is not null) as visited,
          count(*) filter (where exists (select 1 from reached r where r.lead_id = inr.id and r.to_stage = 'reserved')) as reserved
        from inr left join public.campaigns c on c.id = inr.campaign_id
        group by c.name) x),
    'lost_reasons', (select coalesce(jsonb_agg(row_to_json(x) order by x.count desc), '[]') from (
        select lr.label, count(*) as count from inr join public.lost_reasons lr on lr.id = inr.lost_reason_id
        group by lr.label) x),
    'by_sales', (select coalesce(jsonb_agg(row_to_json(t)), '[]') from public.team_summary(p_project, p_from, p_to) t)
  )
$$;
