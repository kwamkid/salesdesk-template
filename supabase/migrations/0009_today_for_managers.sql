-- 0009 "My work today" for managers: admin and executives can look at the whole team's
-- follow-ups, or one sales person's. Sales still see only their own (Row Level Security).
-- Run after 0008.

drop function if exists public.today_list();

-- p_owner: null = the signed-in user · a user id = that person's leads
-- p_all: true = every lead the caller may see (whole team)
create function public.today_list(p_owner uuid default null, p_all boolean default false)
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
      and case
            when p_all and public.my_role() in ('admin', 'executive') then true
            when p_owner is not null and public.my_role() in ('admin', 'executive') then l.owner_id = p_owner
            else l.owner_id = auth.uid()
          end
  ) x
  where bucket is not null
  order by array_position(array['overdue', 'new', 'today', 'week'], x.bucket), x.follow_up, x.lead_name
$$;

revoke execute on function public.today_list(uuid, boolean) from public, anon;
grant execute on function public.today_list(uuid, boolean) to authenticated, service_role;

-- ---------------------------------------------------------------
-- Profile pictures: Google sends one with every sign-in. Shown next to names everywhere.
-- ---------------------------------------------------------------
alter table public.profiles add column avatar_url text not null default '';

update public.profiles p set avatar_url = coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture', '')
from auth.users u where u.id = p.id;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_role public.user_role := 'sales';
  v_status public.user_status := 'pending';
begin
  perform pg_advisory_xact_lock(727001); -- two people signing up at once cannot both become the first admin

  if not exists (select 1 from public.profiles) then
    v_role := 'admin';
    v_status := 'active';
  end if;

  insert into public.profiles (id, full_name, email, role, status, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.email, ''),
    v_role,
    v_status,
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture', '')
  );
  return new;
end
$$;

-- Keep the picture current when Google sends a new one at sign-in.
create function public.sync_avatar() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles
    set avatar_url = coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture', avatar_url)
    where id = new.id;
  return new;
end
$$;
create trigger on_auth_user_updated
  after update of raw_user_meta_data on auth.users
  for each row execute function public.sync_avatar();
revoke execute on function public.sync_avatar() from public, anon;
