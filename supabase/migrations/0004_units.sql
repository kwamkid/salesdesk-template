-- 0004 Plots (units), site plans with pins, interest, reservation lock, realtime status.
-- Run after 0003.

create type public.unit_status as enum ('available', 'interested', 'reserved', 'contracted', 'transferred');

-- One picture of the site plan per zone or phase. Pins are stored as a fraction of the picture
-- (0 to 1), so they stay in place at every zoom level and picture size.
create table public.site_plans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects on delete cascade,
  name text not null default 'ผังโครงการ',
  image_path text, -- file in the "site-plans" storage bucket
  image_w int,
  image_h int,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects on delete cascade,
  code text not null, -- plot number printed on the site plan, e.g. A01
  zone text not null default '',
  house_type text not null default '',
  land_sqw numeric(10, 2),
  usable_sqm numeric(10, 2),
  price numeric(14, 2),
  status public.unit_status not null default 'available',
  note text not null default '',
  plan_id uuid references public.site_plans on delete set null,
  pos_x real check (pos_x between 0 and 1),
  pos_y real check (pos_y between 0 and 1),
  lead_id uuid references public.leads on delete set null, -- the customer who reserved it
  updated_by uuid references public.profiles on delete set null,
  updated_at timestamptz not null default now(),
  unique (project_id, code)
);
create index units_project_idx on public.units (project_id, status);
create index units_lead_idx on public.units (lead_id);

create table public.unit_interests (
  unit_id uuid not null references public.units on delete cascade,
  lead_id uuid not null references public.leads on delete cascade,
  created_by uuid default auth.uid() references public.profiles on delete set null,
  created_at timestamptz not null default now(),
  primary key (unit_id, lead_id)
);
create index unit_interests_lead_idx on public.unit_interests (lead_id);

create table public.unit_status_history (
  id bigint generated always as identity primary key,
  unit_id uuid not null references public.units on delete cascade,
  from_status public.unit_status,
  to_status public.unit_status not null,
  lead_id uuid references public.leads on delete set null,
  changed_by uuid references public.profiles on delete set null,
  changed_at timestamptz not null default now()
);
create index unit_status_history_unit_idx on public.unit_status_history (unit_id, changed_at desc);

-- Thai labels used in the import file -> status key
create function public.unit_status_from_text(p text) returns public.unit_status
language sql immutable set search_path = '' as $$
  select case trim(coalesce(p, ''))
    when '' then 'available'
    when 'ว่าง' then 'available'
    when 'มีคนสนใจ' then 'interested'
    when 'จอง' then 'reserved'
    when 'ทำสัญญา' then 'contracted'
    when 'โอน' then 'transferred'
    else (select e::public.unit_status from unnest(enum_range(null::public.unit_status)) e where e::text = lower(trim(p)))
  end
$$;

-- "A01", "a1" and " A001 " are the same plot when matching pins to the plot list.
create function public.unit_code_key(p text) returns text
language sql immutable set search_path = '' as $$
  select regexp_replace(upper(trim(coalesce(p, ''))), '^([A-Z]*)-?0*([0-9]+)$', '\1\2')
$$;

-- ---------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------
create function public.units_after_status() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.status <> old.status then
    insert into public.unit_status_history (unit_id, from_status, to_status, lead_id, changed_by)
    values (new.id, case when tg_op = 'UPDATE' then old.status end, new.status, new.lead_id, auth.uid());
  end if;
  return null;
end
$$;
create trigger units_after_status after insert or update of status on public.units
  for each row execute function public.units_after_status();

-- A free plot turns "interested" when somebody is interested, and back when nobody is.
create function public.unit_interest_sync() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_unit uuid := coalesce(new.unit_id, old.unit_id);
begin
  update public.units u set
    status = case when exists (select 1 from public.unit_interests i where i.unit_id = u.id)
                  then 'interested'::public.unit_status else 'available'::public.unit_status end,
    updated_at = now()
  where u.id = v_unit and u.status in ('available', 'interested');
  return null;
end
$$;
create trigger unit_interest_sync after insert or delete on public.unit_interests
  for each row execute function public.unit_interest_sync();

-- ---------------------------------------------------------------
-- Functions the pages call (RPC)
-- ---------------------------------------------------------------

-- Everything the plot page needs. Customer names show only to admin, executives,
-- and the sales person who owns that customer.
create function public.unit_board(p_project uuid)
returns table (
  id uuid, code text, zone text, house_type text, land_sqw numeric, usable_sqm numeric, price numeric,
  status public.unit_status, note text, plan_id uuid, pos_x real, pos_y real,
  interest_count int, lead_id uuid, lead_name text, holder_name text, mine boolean, updated_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select
    u.id, u.code, u.zone, u.house_type, u.land_sqw, u.usable_sqm, u.price, u.status, u.note,
    u.plan_id, u.pos_x, u.pos_y,
    (select count(*)::int from public.unit_interests i where i.unit_id = u.id),
    case when public.lead_visible(l.project_id, l.owner_id) then l.id end,
    case when public.lead_visible(l.project_id, l.owner_id) then l.full_name end,
    p.full_name,
    coalesce(l.owner_id = auth.uid(), false),
    u.updated_at
  from public.units u
  left join public.leads l on l.id = u.lead_id
  left join public.profiles p on p.id = l.owner_id
  where u.project_id = p_project and public.can_see_project(p_project)
  order by u.zone, u.code
$$;

-- Reserve, contract or transfer a plot for a customer, with a lock so a plot cannot be
-- reserved twice. Moving a plot back (cancel a reservation) is admin only.
-- The customer's stage moves forward with the plot.
create function public.set_unit_status(p_unit uuid, p_status public.unit_status, p_lead uuid default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  u public.units;
  l public.leads;
  v_order public.unit_status[] := enum_range(null::public.unit_status);
begin
  select * into u from public.units where id = p_unit for update;
  if not found or not public.can_see_project(u.project_id) then raise exception 'not allowed'; end if;

  if array_position(v_order, p_status) < array_position(v_order, u.status) and not public.is_admin() then
    raise exception 'admin only';
  end if;

  if p_status in ('reserved', 'contracted', 'transferred') then
    if coalesce(p_lead, u.lead_id) is null then raise exception 'customer required'; end if;
    if u.lead_id is not null and p_lead is not null and u.lead_id <> p_lead then raise exception 'already reserved'; end if;
    select * into l from public.leads where id = coalesce(p_lead, u.lead_id);
    if l.project_id <> u.project_id then raise exception 'wrong project'; end if;
    if not public.lead_editable(l.project_id, l.owner_id) then raise exception 'not allowed'; end if;

    update public.units set status = p_status, lead_id = l.id, updated_by = auth.uid(), updated_at = now()
    where id = p_unit;

    -- the customer's stage follows the plot (only forward)
    update public.leads set stage = p_status::text::public.lead_stage
    where id = l.id
      and array_position(enum_range(null::public.lead_stage), stage)
          < array_position(enum_range(null::public.lead_stage), p_status::text::public.lead_stage);
  else
    update public.units set
      status = case when exists (select 1 from public.unit_interests i where i.unit_id = p_unit)
                    then 'interested'::public.unit_status else 'available'::public.unit_status end,
      lead_id = null, updated_by = auth.uid(), updated_at = now()
    where id = p_unit;
  end if;
end
$$;

-- Mark or unmark a plot a customer is interested in. A customer can like several plots.
create function public.toggle_interest(p_unit uuid, p_lead uuid, p_on boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_edit_lead(p_lead)
     or not exists (select 1 from public.units u join public.leads l on l.project_id = u.project_id
                    where u.id = p_unit and l.id = p_lead) then
    raise exception 'not allowed';
  end if;
  if p_on then
    insert into public.unit_interests (unit_id, lead_id) values (p_unit, p_lead) on conflict do nothing;
  else
    delete from public.unit_interests where unit_id = p_unit and lead_id = p_lead;
  end if;
end
$$;

-- Import the plot list. p_rows is a JSON array with these keys (the import page maps the
-- Thai column names of 13-Unit_Import_Template.xlsx to them):
--   code (เลขแปลง) · zone (โซน/เฟส) · house_type (แบบบ้าน) · land_sqw (ที่ดิน (ตร.ว.))
--   usable_sqm (พื้นที่ใช้สอย (ตร.ม.)) · price (ราคา (บาท)) · status (สถานะ, Thai label) · note (หมายเหตุ)
-- A plot that already exists is updated (its status is kept unless the file gives one).
-- Returns {"inserted": n, "updated": n, "errors": [{"row": 3, "code": "A03", "error": "..."}]}
create function public.import_units(p_project uuid, p_rows jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r jsonb;
  i int := 0;
  v_ins int := 0;
  v_upd int := 0;
  v_err jsonb := '[]';
  v_code text;
  v_status public.unit_status;
  v_inserted boolean;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  if not exists (select 1 from public.projects where id = p_project) then raise exception 'project not found'; end if;

  for r in select * from jsonb_array_elements(p_rows) loop
    i := i + 1;
    v_code := upper(trim(coalesce(r ->> 'code', '')));
    begin
      if v_code = '' then raise exception 'ไม่มีเลขแปลง'; end if;
      v_status := public.unit_status_from_text(r ->> 'status');
      if v_status is null then raise exception 'สถานะไม่ถูกต้อง: %', r ->> 'status'; end if;

      insert into public.units as u (project_id, code, zone, house_type, land_sqw, usable_sqm, price, status, note, updated_by)
      values (
        p_project, v_code,
        trim(coalesce(r ->> 'zone', '')),
        trim(coalesce(r ->> 'house_type', '')),
        nullif(regexp_replace(coalesce(r ->> 'land_sqw', ''), '[^0-9.]', '', 'g'), '')::numeric,
        nullif(regexp_replace(coalesce(r ->> 'usable_sqm', ''), '[^0-9.]', '', 'g'), '')::numeric,
        nullif(regexp_replace(coalesce(r ->> 'price', ''), '[^0-9.]', '', 'g'), '')::numeric,
        v_status,
        trim(coalesce(r ->> 'note', '')),
        auth.uid()
      )
      on conflict (project_id, code) do update set
        zone = excluded.zone,
        house_type = excluded.house_type,
        land_sqw = excluded.land_sqw,
        usable_sqm = excluded.usable_sqm,
        price = excluded.price,
        status = case when coalesce(trim(r ->> 'status'), '') = '' then u.status else excluded.status end,
        note = excluded.note,
        updated_by = auth.uid(),
        updated_at = now()
      returning (xmax = 0) into v_inserted;
      if v_inserted then v_ins := v_ins + 1; else v_upd := v_upd + 1; end if;
    exception when others then
      v_err := v_err || jsonb_build_object('row', i + 1, 'code', v_code, 'error', sqlerrm);
    end;
  end loop;

  return jsonb_build_object('inserted', v_ins, 'updated', v_upd, 'errors', v_err);
end
$$;

-- Import pin positions made by Claude Code from the site plan picture (pins.json).
-- p_pins: [{"plot": "A01", "x": 0.12, "y": 0.34}, ...]  ("code" works instead of "plot")
-- Returns {"placed": n, "missing_in_list": ["Z99"], "without_pin": ["A07"]}
create function public.import_unit_positions(p_plan uuid, p_pins jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_project uuid;
  r jsonb;
  v_code text;
  v_placed int := 0;
  v_missing jsonb := '[]';
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  select project_id into v_project from public.site_plans where id = p_plan;
  if v_project is null then raise exception 'plan not found'; end if;

  for r in select * from jsonb_array_elements(p_pins) loop
    v_code := upper(trim(coalesce(r ->> 'plot', r ->> 'code', '')));
    update public.units set
      plan_id = p_plan,
      pos_x = least(greatest((r ->> 'x')::real, 0), 1),
      pos_y = least(greatest((r ->> 'y')::real, 0), 1),
      updated_at = now()
    where project_id = v_project and public.unit_code_key(code) = public.unit_code_key(v_code);
    if found then v_placed := v_placed + 1; else v_missing := v_missing || to_jsonb(v_code); end if;
  end loop;

  return jsonb_build_object(
    'placed', v_placed,
    'missing_in_list', v_missing,
    'without_pin', coalesce((select jsonb_agg(code order by code) from public.units
                             where project_id = v_project and (plan_id is null or pos_x is null)), '[]')
  );
end
$$;

-- Edit mode: drag a pin, or tap to place a plot that has none. Admin only.
create function public.move_unit_pin(p_unit uuid, p_plan uuid, p_x real, p_y real) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  update public.units set plan_id = p_plan,
    pos_x = case when p_x is null then null else least(greatest(p_x, 0), 1) end,
    pos_y = case when p_y is null then null else least(greatest(p_y, 0), 1) end,
    updated_at = now()
  where id = p_unit;
end
$$;

-- ---------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------
alter table public.site_plans enable row level security;
alter table public.units enable row level security;
alter table public.unit_interests enable row level security;
alter table public.unit_status_history enable row level security;

create policy site_plans_select on public.site_plans for select to authenticated using (public.can_see_project(project_id));
create policy site_plans_admin on public.site_plans for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Status changes go through set_unit_status(); the admin edits the rest directly.
create policy units_select on public.units for select to authenticated using (public.can_see_project(project_id));
create policy units_admin on public.units for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy unit_interests_select on public.unit_interests for select to authenticated using (public.can_see_lead(lead_id));
create policy unit_status_history_select on public.unit_status_history for select to authenticated
  using (exists (select 1 from public.units u where u.id = unit_id and public.can_see_project(u.project_id)));

grant select, insert, update, delete on public.site_plans, public.units to authenticated;
grant select on public.unit_interests, public.unit_status_history to authenticated;

revoke execute on all functions in schema public from public, anon;
grant execute on function public.invite_info(uuid) to anon, authenticated;
grant execute on function
  public.unit_status_from_text(text), public.unit_code_key(text), public.unit_board(uuid),
  public.set_unit_status(uuid, public.unit_status, uuid), public.toggle_interest(uuid, uuid, boolean),
  public.import_units(uuid, jsonb), public.import_unit_positions(uuid, jsonb),
  public.move_unit_pin(uuid, uuid, real, real)
to authenticated;

-- Every open plot page sees status changes at once (Supabase Realtime).
alter publication supabase_realtime add table public.units;

-- ---------------------------------------------------------------
-- Storage: site plan pictures, private. Path: <project id>/<file name>
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-plans', 'site-plans', false, 10485760, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do nothing;

create policy site_plans_files_select on storage.objects for select to authenticated
  using (bucket_id = 'site-plans' and public.can_see_project(((storage.foldername(name))[1])::uuid));
create policy site_plans_files_admin on storage.objects for all to authenticated
  using (bucket_id = 'site-plans' and public.is_admin())
  with check (bucket_id = 'site-plans' and public.is_admin());
