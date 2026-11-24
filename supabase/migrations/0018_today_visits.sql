-- 0018 "นัดชมวันนี้": customers booked to visit the project today, by time, and whether they have arrived.
-- Same who-sees-what rules as today_list (0014): sales = own leads; admin / executive = p_all or p_owner.
-- arrived_at = the first site-visit check-in made today (activities type 'visit'), null = not here yet.
-- Run after 0017.

create or replace function public.today_visits(p_owner uuid default null, p_all boolean default false, p_project uuid default null)
returns table (
  lead_id uuid, full_name text, phone text, project_name text, stage public.lead_stage,
  appointment_at timestamptz, arrived_at timestamptz, next_follow_up date,
  owner_id uuid, owner_name text
)
language sql stable security invoker set search_path = '' as $$
  select
    l.id, l.full_name, l.phone, pr.name, l.stage,
    l.appointment_at,
    (select min(a.created_at) from public.activities a
      where a.lead_id = l.id and a.type = 'visit'
        and (a.created_at at time zone 'Asia/Bangkok')::date = public.today_th()) as arrived_at,
    l.next_follow_up, l.owner_id, p.full_name
  from public.leads l
  join public.projects pr on pr.id = l.project_id
  left join public.profiles p on p.id = l.owner_id
  where l.appointment_at is not null
    and (l.appointment_at at time zone 'Asia/Bangkok')::date = public.today_th()
    and l.stage not in ('lost', 'unqualified')
    and (p_project is null or l.project_id = p_project)
    and case
          when p_all and public.my_role() in ('admin', 'executive') then true
          when p_owner is not null and public.my_role() in ('admin', 'executive') then l.owner_id = p_owner
          else l.owner_id = auth.uid()
        end
  order by l.appointment_at, l.full_name
$$;

revoke execute on function public.today_visits(uuid, boolean, uuid) from public, anon;
grant execute on function public.today_visits(uuid, boolean, uuid) to authenticated, service_role;
