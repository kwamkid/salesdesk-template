-- 0001 Users (3 roles), projects, project members, invite links.
-- Run this whole file once in the Supabase SQL Editor.

create type public.user_role as enum ('admin', 'executive', 'sales');
create type public.user_status as enum ('pending', 'active', 'disabled');

-- One row per person who signs up. Linked to Supabase Auth.
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null default '',
  email text not null default '',
  role public.user_role not null default 'sales',
  status public.user_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text not null default '',
  fb_page text not null default '',
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

-- Which user looks after which project (many to many).
create table public.project_members (
  project_id uuid not null references public.projects on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  primary key (project_id, user_id)
);
create index project_members_user_idx on public.project_members (user_id);

-- Invite links. Single use, with an expiry date.
create table public.invites (
  token uuid primary key default gen_random_uuid(),
  role public.user_role not null,
  project_ids uuid[] not null default '{}',
  created_by uuid references public.profiles on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references public.profiles on delete set null
);

-- ---------------------------------------------------------------
-- Helper functions used by the security rules
-- ---------------------------------------------------------------

-- Role of the signed-in user. Null when pending or disabled.
create function public.my_role() returns public.user_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid() and status = 'active'
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.my_role() = 'admin', false)
$$;

-- Admin sees every project. Sales sees assigned projects only.
-- An executive with no assigned project sees every project; once the admin
-- assigns projects, the executive sees only those.
create function public.can_see_project(p_project uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select case public.my_role()
    when 'admin' then true
    when 'executive' then
      exists (select 1 from public.project_members m where m.user_id = auth.uid() and m.project_id = p_project)
      or not exists (select 1 from public.project_members m where m.user_id = auth.uid())
    when 'sales' then
      exists (select 1 from public.project_members m where m.user_id = auth.uid() and m.project_id = p_project)
    else false
  end
$$;

-- ---------------------------------------------------------------
-- New sign-up: create the profile
--   first person ever      -> admin, active
--   came with a valid invite -> role from the invite, active
--   anyone else            -> sales, pending (waits for the admin)
-- ---------------------------------------------------------------
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  inv public.invites;
  v_role public.user_role := 'sales';
  v_status public.user_status := 'pending';
  v_token uuid;
begin
  perform pg_advisory_xact_lock(727001); -- two people signing up at once cannot both become the first admin

  if not exists (select 1 from public.profiles) then
    v_role := 'admin';
    v_status := 'active';
  else
    begin
      v_token := (new.raw_user_meta_data ->> 'invite_token')::uuid;
    exception when others then
      v_token := null;
    end;
    if v_token is not null then
      select * into inv from public.invites
        where token = v_token and used_at is null and expires_at > now()
        for update;
      if found then
        v_role := inv.role;
        v_status := 'active';
      end if;
    end if;
  end if;

  insert into public.profiles (id, full_name, email, role, status)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), coalesce(new.email, ''), v_role, v_status);

  if inv.token is not null then
    insert into public.project_members (project_id, user_id)
      select p.id, new.id from public.projects p where p.id = any (inv.project_ids)
      on conflict do nothing;
    update public.invites set used_at = now(), used_by = new.id where token = inv.token;
  end if;

  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------
-- Functions the app calls (RPC). Each one checks the caller's role.
-- ---------------------------------------------------------------

-- The sign-up page shows what an invite link gives, before the person has an account.
create function public.invite_info(p_token uuid)
returns table (role public.user_role, valid boolean)
language sql stable security definer set search_path = '' as $$
  select i.role, (i.used_at is null and i.expires_at > now())
  from public.invites i where i.token = p_token
$$;

create function public.create_invite(p_role public.user_role, p_project_ids uuid[] default '{}', p_days int default 7)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_token uuid;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  insert into public.invites (role, project_ids, created_by, expires_at)
  values (p_role, coalesce(p_project_ids, '{}'), auth.uid(), now() + make_interval(days => greatest(1, least(p_days, 30))))
  returning token into v_token;
  return v_token;
end
$$;

-- Approve, change role, disable, and set the projects of a user.
-- Pass null for p_project_ids to leave the projects as they are.
create function public.admin_update_user(
  p_user uuid, p_role public.user_role, p_status public.user_status, p_project_ids uuid[] default null
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;

  -- The system must always keep at least one active admin.
  if (p_role <> 'admin' or p_status <> 'active')
     and exists (select 1 from public.profiles where id = p_user and role = 'admin' and status = 'active')
     and (select count(*) from public.profiles where role = 'admin' and status = 'active') <= 1 then
    raise exception 'last admin';
  end if;

  update public.profiles set role = p_role, status = p_status where id = p_user;

  if p_project_ids is not null then
    delete from public.project_members where user_id = p_user and project_id <> all (p_project_ids);
    insert into public.project_members (project_id, user_id)
      select p.id, p_user from public.projects p where p.id = any (p_project_ids)
      on conflict do nothing;
  end if;
end
$$;

create function public.update_my_name(p_name text) returns void
language sql security definer set search_path = '' as $$
  update public.profiles set full_name = left(trim(p_name), 100) where id = auth.uid()
$$;

-- ---------------------------------------------------------------
-- Row Level Security: the database itself decides who sees what.
-- ---------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.invites enable row level security;

-- profiles: you see yourself; admin and executive see everyone. Changes go through the functions above.
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.my_role() in ('admin', 'executive'));

create policy projects_select on public.projects for select to authenticated
  using (public.can_see_project(id));
create policy projects_admin_write on public.projects for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy members_select on public.project_members for select to authenticated
  using (user_id = auth.uid() or public.my_role() in ('admin', 'executive'));
create policy members_admin_write on public.project_members for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy invites_admin on public.invites for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------
-- Access for the API roles
-- ---------------------------------------------------------------
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.projects, public.project_members, public.invites to authenticated;

revoke execute on function
  public.my_role(), public.is_admin(), public.can_see_project(uuid), public.handle_new_user(),
  public.create_invite(public.user_role, uuid[], int),
  public.admin_update_user(uuid, public.user_role, public.user_status, uuid[]),
  public.update_my_name(text)
from public, anon;
grant execute on function
  public.my_role(), public.is_admin(), public.can_see_project(uuid),
  public.create_invite(public.user_role, uuid[], int),
  public.admin_update_user(uuid, public.user_role, public.user_status, uuid[]),
  public.update_my_name(text)
to authenticated;
grant execute on function public.invite_info(uuid) to anon, authenticated;
