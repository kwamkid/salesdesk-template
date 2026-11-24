-- 0006 Dashboard numbers and the data behind every export file. Run after 0005.
-- All of these run with the caller's rights (security invoker), so Row Level Security
-- decides which leads are counted: sales get their own, executives their projects.

-- Short code that stands for a customer in files sent to Claude (no name, no phone).
create function public.lead_code(p_id uuid) returns text
language sql immutable set search_path = '' as $$
  select 'C-' || upper(left(replace(p_id::text, '-', ''), 6))
$$;

-- Per sales person: workload and results for leads created in the range.
create function public.team_summary(p_project uuid default null, p_from date default null, p_to date default null)
returns table (
  owner_id uuid, owner_name text, leads_open bigint, leads_in_range bigint, activities bigint,
  activities_per_week numeric, avg_hours_to_first_contact numeric, overdue bigint,
  appointments bigint, visits bigint, reservations bigint, lost bigint, top_lost_reason text
)
language sql stable security invoker set search_path = '' as $$
  with rng as (
    select coalesce(p_from, public.today_th() - 29) as d1, coalesce(p_to, public.today_th()) as d2
  ),
  l as (
    select x.* from public.leads x, rng
    where x.owner_id is not null and (p_project is null or x.project_id = p_project)
  ),
  inr as (select l.* from l, rng where (l.created_at at time zone 'Asia/Bangkok')::date between rng.d1 and rng.d2),
  reached as (
    select h.lead_id, h.to_stage from public.stage_history h join inr on inr.id = h.lead_id group by 1, 2
  )
  select
    p.id,
    p.full_name,
    (select count(*) from l where l.owner_id = p.id and public.is_open_stage(l.stage)),
    (select count(*) from inr where inr.owner_id = p.id),
    (select count(*) from public.activities a join l on l.id = a.lead_id, rng
      where a.created_by = p.id and (a.created_at at time zone 'Asia/Bangkok')::date between rng.d1 and rng.d2),
    round((select count(*) from public.activities a join l on l.id = a.lead_id, rng
      where a.created_by = p.id and (a.created_at at time zone 'Asia/Bangkok')::date between rng.d1 and rng.d2)::numeric
      / greatest(((select d2 - d1 + 1 from rng))::numeric / 7, 1), 1),
    round((select avg(extract(epoch from inr.first_contact_at - inr.created_at) / 3600)
      from inr where inr.owner_id = p.id and inr.first_contact_at is not null)::numeric, 1),
    (select count(*) from l where l.owner_id = p.id and public.is_open_stage(l.stage) and l.next_follow_up < public.today_th()),
    (select count(*) from reached r join inr on inr.id = r.lead_id where inr.owner_id = p.id and r.to_stage = 'appointment'),
    (select count(*) from inr where inr.owner_id = p.id and inr.visited_at is not null),
    (select count(*) from reached r join inr on inr.id = r.lead_id where inr.owner_id = p.id and r.to_stage = 'reserved'),
    (select count(*) from inr where inr.owner_id = p.id and inr.stage = 'lost'),
    (select lr.label from inr join public.lost_reasons lr on lr.id = inr.lost_reason_id
      where inr.owner_id = p.id group by lr.label order by count(*) desc limit 1)
  from public.profiles p
  where p.role = 'sales' and (exists (select 1 from l where l.owner_id = p.id) or p.status = 'active')
  order by p.full_name
$$;

-- Everything on the executive dashboard in one call.
create function public.dashboard(p_project uuid default null, p_from date default null, p_to date default null)
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

-- ---------------------------------------------------------------
-- Export files (the server turns these rows into CSV files Excel reads in Thai)
-- ---------------------------------------------------------------
create function public.export_leads(
  p_project uuid default null, p_owner uuid default null, p_stage public.lead_stage default null,
  p_from date default null, p_to date default null
)
returns table (
  full_name text, phone text, email text, project text, owner text, campaign text, stage public.lead_stage,
  visited boolean, visited_at timestamptz, next_follow_up date, last_note text, created_at timestamptz
)
language sql stable security invoker set search_path = '' as $$
  select l.full_name, l.phone, l.email, pr.name, p.full_name, c.name, l.stage,
    l.visited_at is not null, l.visited_at, l.next_follow_up, l.last_note, l.created_at
  from public.leads l
  join public.projects pr on pr.id = l.project_id
  left join public.profiles p on p.id = l.owner_id
  left join public.campaigns c on c.id = l.campaign_id
  where (p_project is null or l.project_id = p_project)
    and (p_owner is null or l.owner_id = p_owner)
    and (p_stage is null or l.stage = p_stage)
    and (p_from is null or (l.created_at at time zone 'Asia/Bangkok')::date >= p_from)
    and (p_to is null or (l.created_at at time zone 'Asia/Bangkok')::date <= p_to)
  order by l.created_at desc
$$;

create function public.export_activities(
  p_project uuid default null, p_owner uuid default null, p_from date default null, p_to date default null
)
returns table (customer text, project text, type public.activity_type, note text, created_at timestamptz, by_name text)
language sql stable security invoker set search_path = '' as $$
  select l.full_name, pr.name, a.type, a.note, a.created_at, p.full_name
  from public.activities a
  join public.leads l on l.id = a.lead_id
  join public.projects pr on pr.id = l.project_id
  left join public.profiles p on p.id = a.created_by
  where (p_project is null or l.project_id = p_project)
    and (p_owner is null or a.created_by = p_owner)
    and (p_from is null or (a.created_at at time zone 'Asia/Bangkok')::date >= p_from)
    and (p_to is null or (a.created_at at time zone 'Asia/Bangkok')::date <= p_to)
  order by a.created_at desc
$$;

-- Follow-ups due today or overdue, grouped by sales person.
create function public.export_overdue(p_project uuid default null, p_owner uuid default null)
returns table (owner text, customer text, phone text, project text, stage public.lead_stage,
               next_follow_up date, days_overdue int, last_note text)
language sql stable security invoker set search_path = '' as $$
  select coalesce(p.full_name, 'ยังไม่มีเจ้าของ'), l.full_name, l.phone, pr.name, l.stage, l.next_follow_up,
    public.today_th() - l.next_follow_up, l.last_note
  from public.leads l
  join public.projects pr on pr.id = l.project_id
  left join public.profiles p on p.id = l.owner_id
  where public.is_open_stage(l.stage) and l.next_follow_up <= public.today_th()
    and (p_project is null or l.project_id = p_project)
    and (p_owner is null or l.owner_id = p_owner)
  order by 1, l.next_follow_up
$$;

-- Audience list for Meta: phone (international format) and email only.
-- p_group: unqualified · lost · visited · reserved (reserved, contracted, transferred) · all
create function public.export_meta_audience(p_group text, p_project uuid default null)
returns table (phone text, email text)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if public.my_role() not in ('admin', 'executive') then raise exception 'not allowed'; end if;
  return query
    select distinct
      case when l.phone ~ '^0[0-9]{8,9}$' then '66' || substr(l.phone, 2) else l.phone end,
      l.email
    from public.leads l
    where (p_project is null or l.project_id = p_project)
      and case p_group
        when 'unqualified' then l.stage = 'unqualified'
        when 'lost' then l.stage = 'lost'
        when 'visited' then l.visited_at is not null
        when 'reserved' then l.stage in ('reserved', 'contracted', 'transferred')
        when 'all' then true
        else false
      end;
end
$$;

-- Sales-team analysis pack for Claude: activities with notes, customers shown as codes.
create function public.team_pack_activities(p_project uuid default null, p_from date default null, p_to date default null)
returns table (customer_code text, project text, sales text, type public.activity_type, note text,
               created_at timestamptz, stage_now public.lead_stage, lead_created_at timestamptz)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if public.my_role() not in ('admin', 'executive') then raise exception 'not allowed'; end if;
  return query
    select public.lead_code(l.id), pr.name, p.full_name, a.type,
      -- notes can contain phone numbers; mask anything that looks like one
      regexp_replace(a.note, '0[0-9][0-9 -]{7,11}[0-9]', '[เบอร์โทร]', 'g'),
      a.created_at, l.stage, l.created_at
    from public.activities a
    join public.leads l on l.id = a.lead_id
    join public.projects pr on pr.id = l.project_id
    left join public.profiles p on p.id = a.created_by
    where (p_project is null or l.project_id = p_project)
      and (a.created_at at time zone 'Asia/Bangkok')::date between coalesce(p_from, public.today_th() - 29) and coalesce(p_to, public.today_th())
    order by p.full_name, a.created_at;
end
$$;

-- "My results this month" on /me: this month next to last month (Bangkok months).
create function public.my_month_stats()
returns table (metric text, this_month bigint, last_month bigint)
language sql stable security invoker set search_path = '' as $$
  with m as (
    select date_trunc('month', public.today_th())::date as m0,
           (date_trunc('month', public.today_th()) - interval '1 month')::date as m1
  ),
  b as (
    select 'new_leads' as metric, (l.created_at at time zone 'Asia/Bangkok')::date as d
      from public.leads l where l.owner_id = auth.uid()
    union all
    select 'activities', (a.created_at at time zone 'Asia/Bangkok')::date
      from public.activities a where a.created_by = auth.uid()
    union all
    select case h.to_stage when 'appointment' then 'appointments' else 'reservations' end,
           (h.changed_at at time zone 'Asia/Bangkok')::date
      from public.stage_history h join public.leads l on l.id = h.lead_id
      where l.owner_id = auth.uid() and h.to_stage in ('appointment', 'reserved')
  )
  select k.metric,
    (select count(*) from b, m where b.metric = k.metric and b.d >= m.m0),
    (select count(*) from b, m where b.metric = k.metric and b.d >= m.m1 and b.d < m.m0)
  from unnest(array['new_leads', 'activities', 'appointments', 'reservations']) with ordinality as k(metric, ord)
  order by k.ord
$$;

grant execute on function
  public.lead_code(uuid), public.my_month_stats(),
  public.team_summary(uuid, date, date), public.dashboard(uuid, date, date),
  public.export_leads(uuid, uuid, public.lead_stage, date, date),
  public.export_activities(uuid, uuid, date, date),
  public.export_overdue(uuid, uuid),
  public.export_meta_audience(text, uuid),
  public.team_pack_activities(uuid, date, date)
to authenticated;

revoke execute on all functions in schema public from public, anon;
grant execute on function public.invite_info(uuid) to anon, authenticated;

-- The server (secret key = service_role) runs the cron jobs, Meta sending and push.
-- Give it every table and function explicitly, whatever the project's default privileges are.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
