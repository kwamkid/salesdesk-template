-- 0002 Google login. Run after 0001.
-- With Google there is no sign-up form, so an invite cannot travel inside the sign-up data.
-- The person signs in with Google first (becomes "pending"), then the app calls
-- redeem_invite() with the token from the invite link and the role applies at once.

-- Google puts the person's name in "full_name" or "name". Keep the rest of 0001 as it was.
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

  insert into public.profiles (id, full_name, email, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.email, ''),
    v_role,
    v_status
  );
  return new;
end
$$;

-- Use an invite link. Works only for a signed-in user who is still waiting for approval,
-- so an active user cannot change their own role with somebody else's link.
create function public.redeem_invite(p_token uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  inv public.invites;
begin
  select * into inv from public.invites
    where token = p_token and used_at is null and expires_at > now()
    for update;
  if not found then return false; end if;

  update public.profiles set role = inv.role, status = 'active'
    where id = auth.uid() and status = 'pending';
  if not found then return false; end if;

  insert into public.project_members (project_id, user_id)
    select p.id, auth.uid() from public.projects p where p.id = any (inv.project_ids)
    on conflict do nothing;
  update public.invites set used_at = now(), used_by = auth.uid() where token = inv.token;
  return true;
end
$$;

revoke execute on function public.redeem_invite(uuid) from public, anon;
grant execute on function public.redeem_invite(uuid) to authenticated;
