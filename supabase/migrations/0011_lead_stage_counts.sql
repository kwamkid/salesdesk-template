-- 0011 Counts for the stage tabs on /leads: how many leads per stage, plus how many are overdue,
-- with the same filters as search_leads (0003) except stage and overdue themselves.
-- Security invoker: Row Level Security limits sales to their own leads, like the list.
-- Run after 0010.

create function public.lead_stage_counts(
  p_q text default null,
  p_project uuid default null,
  p_owner uuid default null,
  p_campaign uuid default null,
  p_from date default null,
  p_to date default null
)
returns table (stage text, n bigint)
language sql stable security invoker set search_path = '' as $$
  with f as (
    select l.stage, l.next_follow_up
    from public.leads l
    where (p_q is null or p_q = ''
           or l.full_name ilike '%' || p_q || '%'
           or (length(public.normalize_phone(p_q)) >= 3 and l.phone like '%' || public.normalize_phone(p_q) || '%'))
      and (p_project is null or l.project_id = p_project)
      and (p_owner is null or l.owner_id = p_owner)
      and (p_campaign is null or l.campaign_id = p_campaign)
      and (p_from is null or (l.created_at at time zone 'Asia/Bangkok')::date >= p_from)
      and (p_to is null or (l.created_at at time zone 'Asia/Bangkok')::date <= p_to)
  )
  select f.stage::text, count(*) from f group by f.stage
  union all
  select 'overdue', count(*) from f where f.next_follow_up < public.today_th()
$$;

revoke execute on function public.lead_stage_counts(text, uuid, uuid, uuid, date, date) from public, anon;
grant execute on function public.lead_stage_counts(text, uuid, uuid, uuid, date, date) to authenticated, service_role;
