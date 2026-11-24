-- 0014 "งานวันนี้" follows the project picked in the left menu.
-- Same as 0009 plus p_project: null = every project the caller may see.
-- Run after 0013.

drop function if exists public.today_list(uuid, boolean);

create function public.today_list(p_owner uuid default null, p_all boolean default false, p_project uuid default null)
returns table (
  bucket text, lead_id uuid, full_name text, phone text, project_name text, stage public.lead_stage,
  last_note text, next_follow_up date, days_overdue int, appointment_at timestamptz,
  owner_id uuid, owner_name text
)
language sql stable security invoker set search_path = '' as $$
  select * from (
    select
      case
        when l.next_follow_up < public.today_th() then 'overdue'
        when l.first_contact_at is null then 'new'
        when l.next_follow_up = public.today_th() then 'today'
        when l.next_follow_up <= public.today_th() + 7 then 'week'
      end as bucket,
      l.id as lead_id, l.full_name as lead_name, l.phone, pr.name as project_name, l.stage, l.last_note,
      l.next_follow_up as follow_up, greatest(public.today_th() - l.next_follow_up, 0) as days_overdue,
      l.appointment_at, l.owner_id, p.full_name as owner_name
    from public.leads l
    join public.projects pr on pr.id = l.project_id
    left join public.profiles p on p.id = l.owner_id
    where public.is_open_stage(l.stage)
      and (p_project is null or l.project_id = p_project)
      and case
            when p_all and public.my_role() in ('admin', 'executive') then true
            when p_owner is not null and public.my_role() in ('admin', 'executive') then l.owner_id = p_owner
            else l.owner_id = auth.uid()
          end
  ) x
  where bucket is not null
  order by array_position(array['overdue', 'new', 'today', 'week'], x.bucket), x.follow_up, x.lead_name
$$;

revoke execute on function public.today_list(uuid, boolean, uuid) from public, anon;
grant execute on function public.today_list(uuid, boolean, uuid) to authenticated, service_role;
