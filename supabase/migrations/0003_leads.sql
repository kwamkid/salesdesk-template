-- 0003 Leads, activities, stage history, campaigns, lost reasons, loan screening.
-- Run after 0002. Pages call the functions (RPC) at the bottom instead of building queries themselves.

create type public.lead_stage as enum (
  'new', 'qualified', 'appointment', 'visited', 'reserved', 'contracted', 'transferred', 'lost', 'unqualified'
);
create type public.activity_type as enum ('call', 'chat', 'meeting', 'visit', 'other');
create type public.loan_status as enum ('not_screened', 'waiting_docs', 'submitted', 'approved', 'rejected');

-- Today's date in Thailand. The database clock runs in UTC.
create function public.today_th() returns date
language sql stable set search_path = '' as $$
  select (now() at time zone 'Asia/Bangkok')::date
$$;

-- "081-234 5678", "+66812345678" and "66812345678" all become "0812345678".
create function public.normalize_phone(p text) returns text
language sql immutable set search_path = '' as $$
  select case
    when d ~ '^66[0-9]{8,9}$' then '0' || substr(d, 3)
    else d
  end
  from (select regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g') as d) x
$$;

create function public.is_open_stage(s public.lead_stage) returns boolean
language sql immutable set search_path = '' as $$
  select s not in ('transferred', 'lost', 'unqualified')
$$;

-- ---------------------------------------------------------------
-- Lists the admin edits in Settings
-- ---------------------------------------------------------------
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  project_id uuid references public.projects on delete cascade, -- null = every project
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.lost_reasons (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  sort int not null default 0,
  is_active boolean not null default true
);
insert into public.lost_reasons (label, sort) values
  ('งบไม่พอ', 1), ('กู้ไม่ผ่าน', 2), ('ทำเลไม่ตรงความต้องการ', 3), ('ซื้อโครงการอื่น', 4),
  ('แบบบ้านไม่ตรงความต้องการ', 5), ('ยังไม่พร้อมซื้อ', 6), ('ติดต่อไม่ได้', 7);

-- Value and Meta event of each stage, per project. No row = send the event, no value.
create table public.stage_settings (
  project_id uuid not null references public.projects on delete cascade,
  stage public.lead_stage not null,
  value numeric(14, 2),
  send_event boolean not null default true,
  event_name text not null default '',
  primary key (project_id, stage)
);

-- ---------------------------------------------------------------
-- Leads (customers)
-- ---------------------------------------------------------------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects on delete restrict,
  owner_id uuid references public.profiles on delete set null, -- sales person; null = waiting for the admin
  full_name text not null check (length(trim(full_name)) > 0),
  phone text not null check (length(phone) >= 9),
  email text not null default '',
  campaign_id uuid references public.campaigns on delete set null,
  stage public.lead_stage not null default 'new',
  next_follow_up date default public.today_th(),
  appointment_at timestamptz,
  lost_reason_id uuid references public.lost_reasons on delete set null,
  address text not null default '',
  national_id text not null default '', -- never exported, never sent to Meta
  last_note text not null default '',
  last_activity_at timestamptz,
  first_contact_at timestamptz,
  visited_at timestamptz,
  source text not null default 'app', -- app · web (lead form) · import
  created_by uuid default auth.uid() references public.profiles on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint open_lead_needs_follow_up check (not public.is_open_stage(stage) or next_follow_up is not null),
  constraint lost_needs_reason check (stage <> 'lost' or lost_reason_id is not null)
);
create index leads_project_idx on public.leads (project_id);
create index leads_owner_follow_idx on public.leads (owner_id, next_follow_up);
create index leads_stage_idx on public.leads (stage);
create index leads_created_idx on public.leads (created_at);
create index leads_phone_idx on public.leads (phone);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads on delete cascade,
  type public.activity_type not null,
  note text not null default '',
  photo_path text, -- file in the "visit-photos" storage bucket
  created_by uuid default auth.uid() references public.profiles on delete set null,
  created_at timestamptz not null default now()
);
create index activities_lead_idx on public.activities (lead_id, created_at desc);
create index activities_created_idx on public.activities (created_at);

create table public.stage_history (
  id bigint generated always as identity primary key,
  lead_id uuid not null references public.leads on delete cascade,
  from_stage public.lead_stage,
  to_stage public.lead_stage not null,
  changed_by uuid references public.profiles on delete set null,
  changed_at timestamptz not null default now()
);
create index stage_history_lead_idx on public.stage_history (lead_id);
create index stage_history_changed_idx on public.stage_history (changed_at);

-- Loan pre-screening result, one per lead (used again in lesson 2.14).
create table public.loan_screenings (
  lead_id uuid primary key references public.leads on delete cascade,
  status public.loan_status not null default 'not_screened',
  occupation text not null default '',
  monthly_income numeric(12, 2),
  monthly_debt numeric(12, 2),
  wanted_amount numeric(14, 2),
  bank text not null default '',
  approved_amount numeric(14, 2),
  fail_reason text not null default '',
  updated_by uuid default auth.uid() references public.profiles on delete set null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Who may see and change a lead
-- ---------------------------------------------------------------
-- admin: every lead · executive: leads of projects they can see · sales: their own leads
create function public.lead_visible(p_project uuid, p_owner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select case public.my_role()
    when 'admin' then true
    when 'executive' then public.can_see_project(p_project)
    when 'sales' then p_owner = auth.uid()
    else false
  end
$$;

-- admin: every lead · sales: own leads in projects they look after · executive: read only
create function public.lead_editable(p_project uuid, p_owner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select case public.my_role()
    when 'admin' then true
    when 'sales' then p_owner = auth.uid() and public.can_see_project(p_project)
    else false
  end
$$;

create function public.can_see_lead(p_lead uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select public.lead_visible(project_id, owner_id) from public.leads where id = p_lead), false)
$$;

create function public.can_edit_lead(p_lead uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select public.lead_editable(project_id, owner_id) from public.leads where id = p_lead), false)
$$;

-- ---------------------------------------------------------------
-- Triggers: tidy the data and keep the history
-- ---------------------------------------------------------------
create function public.leads_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.phone := public.normalize_phone(new.phone);
  new.email := lower(trim(coalesce(new.email, '')));
  new.full_name := trim(new.full_name);
  if not public.is_open_stage(new.stage) then new.next_follow_up := null; end if;
  if new.stage <> 'lost' then new.lost_reason_id := null; end if;
  if tg_op = 'UPDATE' then new.updated_at := now(); end if;
  return new;
end
$$;
create trigger leads_before_write before insert or update on public.leads
  for each row execute function public.leads_before_write();

create function public.leads_after_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.stage_history (lead_id, from_stage, to_stage, changed_by)
    values (new.id, null, new.stage, auth.uid());
  elsif new.stage <> old.stage then
    insert into public.stage_history (lead_id, from_stage, to_stage, changed_by)
    values (new.id, old.stage, new.stage, auth.uid());
  end if;
  return null;
end
$$;
create trigger leads_after_write after insert or update of stage on public.leads
  for each row execute function public.leads_after_write();

create function public.activities_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.leads set
    last_note = left(new.note, 500),
    last_activity_at = new.created_at,
    -- only a call, chat, meeting or visit by a person counts as contacting the customer;
    -- a note ("other") or a note from the website form (no user) does not
    first_contact_at = case when new.created_by is null or new.type = 'other' then first_contact_at
                            else coalesce(first_contact_at, new.created_at) end
  where id = new.lead_id;
  return null;
end
$$;
create trigger activities_after_insert after insert on public.activities
  for each row execute function public.activities_after_insert();

create function public.loan_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end
$$;
create trigger loan_before_write before insert or update on public.loan_screenings
  for each row execute function public.loan_before_write();

-- ---------------------------------------------------------------
-- Functions the pages call (RPC)
-- ---------------------------------------------------------------

-- Record a call, chat, meeting... An open lead must get its next follow-up date.
create function public.log_activity(
  p_lead uuid, p_type public.activity_type, p_note text, p_next_follow_up date default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  l public.leads;
  v_id uuid;
begin
  select * into l from public.leads where id = p_lead;
  if not found or not public.lead_editable(l.project_id, l.owner_id) then raise exception 'not allowed'; end if;
  if coalesce(trim(p_note), '') = '' then raise exception 'note required'; end if;
  if public.is_open_stage(l.stage) and p_next_follow_up is null then raise exception 'next follow-up required'; end if;
  if p_next_follow_up < public.today_th() then raise exception 'next follow-up in the past'; end if;

  insert into public.activities (lead_id, type, note) values (p_lead, p_type, trim(p_note)) returning id into v_id;
  if public.is_open_stage(l.stage) then
    update public.leads set next_follow_up = p_next_follow_up where id = p_lead;
  end if;
  return v_id;
end
$$;

-- Move a lead to another stage. "lost" needs a reason; an open stage needs a follow-up date.
create function public.change_stage(
  p_lead uuid,
  p_stage public.lead_stage,
  p_lost_reason uuid default null,
  p_next_follow_up date default null,
  p_appointment_at timestamptz default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  l public.leads;
begin
  select * into l from public.leads where id = p_lead for update;
  if not found or not public.lead_editable(l.project_id, l.owner_id) then raise exception 'not allowed'; end if;
  if p_stage = 'lost' and p_lost_reason is null then raise exception 'lost reason required'; end if;
  if p_stage = 'appointment' and p_appointment_at is null and l.appointment_at is null then
    raise exception 'appointment time required';
  end if;
  if public.is_open_stage(p_stage) and coalesce(p_next_follow_up, l.next_follow_up) is null then
    raise exception 'next follow-up required';
  end if;

  update public.leads set
    stage = p_stage,
    lost_reason_id = p_lost_reason,
    next_follow_up = coalesce(p_next_follow_up, next_follow_up, public.today_th()),
    appointment_at = coalesce(p_appointment_at, appointment_at)
  where id = p_lead;
end
$$;

-- Site-visit check-in. Saves the visit at once; the photo is attached later
-- with attach_activity_photo() once the background upload has finished.
create function public.check_in_visit(p_lead uuid, p_note text, p_next_follow_up date) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  l public.leads;
  v_id uuid;
begin
  select * into l from public.leads where id = p_lead for update;
  if not found or not public.lead_editable(l.project_id, l.owner_id) then raise exception 'not allowed'; end if;
  if p_next_follow_up is null and l.stage in ('new', 'qualified', 'appointment', 'visited') then
    raise exception 'next follow-up required';
  end if;

  insert into public.activities (lead_id, type, note)
  values (p_lead, 'visit', coalesce(nullif(trim(p_note), ''), 'มาชมโครงการ'))
  returning id into v_id;

  update public.leads set
    visited_at = coalesce(visited_at, now()),
    stage = case when stage in ('new', 'qualified', 'appointment') then 'visited'::public.lead_stage else stage end,
    next_follow_up = coalesce(p_next_follow_up, next_follow_up)
  where id = p_lead;
  return v_id;
end
$$;

create function public.attach_activity_photo(p_activity uuid, p_path text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.activities a set photo_path = p_path
  where a.id = p_activity and public.can_edit_lead(a.lead_id);
  if not found then raise exception 'not allowed'; end if;
end
$$;

-- Duplicate phone check on "add lead". Works across sales people, but only names the owner.
create function public.find_phone(p_phone text)
returns table (lead_id uuid, owner_name text, project_name text, stage public.lead_stage, mine boolean)
language sql stable security definer set search_path = '' as $$
  select
    case when public.lead_visible(l.project_id, l.owner_id) then l.id end,
    coalesce(nullif(p.full_name, ''), 'ยังไม่มีเจ้าของ'),
    pr.name,
    l.stage,
    l.owner_id = auth.uid()
  from public.leads l
  join public.projects pr on pr.id = l.project_id
  left join public.profiles p on p.id = l.owner_id
  where public.my_role() is not null
    and length(public.normalize_phone(p_phone)) >= 9
    and l.phone = public.normalize_phone(p_phone)
  limit 5
$$;

-- "My work today": the signed-in user's open leads, in 4 groups.
--   overdue · new (never contacted) · today · week (next 7 days)
create function public.today_list()
returns table (
  bucket text, lead_id uuid, full_name text, phone text, project_name text, stage public.lead_stage,
  last_note text, next_follow_up date, days_overdue int, appointment_at timestamptz
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
      l.id, l.full_name, l.phone, pr.name, l.stage, l.last_note, l.next_follow_up,
      greatest(public.today_th() - l.next_follow_up, 0), l.appointment_at
    from public.leads l
    join public.projects pr on pr.id = l.project_id
    where l.owner_id = auth.uid() and public.is_open_stage(l.stage)
  ) x
  where bucket is not null
  order by array_position(array['overdue', 'new', 'today', 'week'], bucket), next_follow_up, full_name
$$;

-- Customer list with every filter, 30 rows at a time. total = rows matching, for "load more".
create function public.search_leads(
  p_q text default null,
  p_project uuid default null,
  p_stage public.lead_stage default null,
  p_owner uuid default null,
  p_campaign uuid default null,
  p_from date default null,
  p_to date default null,
  p_overdue boolean default false,
  p_limit int default 30,
  p_offset int default 0
)
returns table (
  id uuid, full_name text, phone text, project_id uuid, project_name text, owner_id uuid, owner_name text,
  campaign_name text, stage public.lead_stage, next_follow_up date, last_note text,
  last_activity_at timestamptz, created_at timestamptz, overdue boolean, total bigint
)
language sql stable security invoker set search_path = '' as $$
  select
    l.id, l.full_name, l.phone, l.project_id, pr.name, l.owner_id, p.full_name, c.name, l.stage,
    l.next_follow_up, l.last_note, l.last_activity_at, l.created_at,
    coalesce(l.next_follow_up < public.today_th(), false),
    count(*) over ()
  from public.leads l
  join public.projects pr on pr.id = l.project_id
  left join public.profiles p on p.id = l.owner_id
  left join public.campaigns c on c.id = l.campaign_id
  where (p_q is null or p_q = ''
         or l.full_name ilike '%' || p_q || '%'
         or (length(public.normalize_phone(p_q)) >= 3 and l.phone like '%' || public.normalize_phone(p_q) || '%'))
    and (p_project is null or l.project_id = p_project)
    and (p_stage is null or l.stage = p_stage)
    and (p_owner is null or l.owner_id = p_owner)
    and (p_campaign is null or l.campaign_id = p_campaign)
    and (p_from is null or (l.created_at at time zone 'Asia/Bangkok')::date >= p_from)
    and (p_to is null or (l.created_at at time zone 'Asia/Bangkok')::date <= p_to)
    and (not coalesce(p_overdue, false) or l.next_follow_up < public.today_th())
  order by l.next_follow_up nulls last, l.created_at desc
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0)
$$;

-- Staff member leaves: move all of their leads to someone else in one go. Admin only.
create function public.transfer_leads(p_from uuid, p_to uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  if not exists (select 1 from public.profiles where id = p_to and status = 'active') then
    raise exception 'target not active';
  end if;
  -- one summary message instead of one "new lead" message per lead
  perform set_config('salesdesk.bulk_transfer', 'on', true);
  update public.leads set owner_id = p_to where owner_id = p_from;
  get diagnostics n = row_count;
  perform set_config('salesdesk.bulk_transfer', 'off', true);
  if n > 0 and to_regprocedure('public.notify(uuid,text,text,text,text,text)') is not null then
    perform public.notify(p_to, 'task', 'ได้รับลีดที่ย้ายมา ' || n || ' ราย', 'เปิดรายการลูกค้าเพื่อดู', '/leads', null);
  end if;
  return n;
end
$$;

-- Sales person in a project with the fewest open leads (for leads from the website form).
create function public.pick_owner(p_project uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select m.user_id
  from public.project_members m
  join public.profiles p on p.id = m.user_id and p.role = 'sales' and p.status = 'active'
  left join public.leads l on l.owner_id = m.user_id and public.is_open_stage(l.stage)
  where m.project_id = p_project
  group by m.user_id
  order by count(l.id), random()
  limit 1
$$;

-- ---------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------
-- Everyone at work may see colleagues' names (timeline authors, plot holders).
-- 0001 let sales see only themselves.
drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.my_role() is not null);

alter table public.campaigns enable row level security;
alter table public.lost_reasons enable row level security;
alter table public.stage_settings enable row level security;
alter table public.leads enable row level security;
alter table public.activities enable row level security;
alter table public.stage_history enable row level security;
alter table public.loan_screenings enable row level security;

create policy campaigns_select on public.campaigns for select to authenticated using (public.my_role() is not null);
create policy campaigns_admin on public.campaigns for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy lost_reasons_select on public.lost_reasons for select to authenticated using (public.my_role() is not null);
create policy lost_reasons_admin on public.lost_reasons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy stage_settings_select on public.stage_settings for select to authenticated
  using (public.can_see_project(project_id));
create policy stage_settings_admin on public.stage_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy leads_select on public.leads for select to authenticated
  using (public.lead_visible(project_id, owner_id));
-- sales add leads for themselves in their own projects; admin adds for anyone
create policy leads_insert on public.leads for insert to authenticated
  with check (public.is_admin() or (public.my_role() = 'sales' and owner_id = auth.uid() and public.can_see_project(project_id)));
-- a sales person cannot give their lead away; the admin moves leads
create policy leads_update on public.leads for update to authenticated
  using (public.lead_editable(project_id, owner_id)) with check (public.lead_editable(project_id, owner_id));
create policy leads_delete on public.leads for delete to authenticated using (public.is_admin());

create policy activities_select on public.activities for select to authenticated using (public.can_see_lead(lead_id));
create policy activities_insert on public.activities for insert to authenticated with check (public.can_edit_lead(lead_id));

create policy stage_history_select on public.stage_history for select to authenticated using (public.can_see_lead(lead_id));

create policy loan_select on public.loan_screenings for select to authenticated using (public.can_see_lead(lead_id));
create policy loan_write on public.loan_screenings for all to authenticated
  using (public.can_edit_lead(lead_id)) with check (public.can_edit_lead(lead_id));

grant select, insert, update, delete on public.campaigns, public.lost_reasons, public.stage_settings, public.leads to authenticated;
grant select, insert on public.activities to authenticated;
grant select on public.stage_history to authenticated;
grant select, insert, update on public.loan_screenings to authenticated;

revoke execute on all functions in schema public from public, anon;
grant execute on function public.invite_info(uuid) to anon, authenticated;
grant execute on function
  public.today_th(), public.normalize_phone(text), public.is_open_stage(public.lead_stage),
  public.lead_visible(uuid, uuid), public.lead_editable(uuid, uuid), public.can_see_lead(uuid), public.can_edit_lead(uuid),
  public.log_activity(uuid, public.activity_type, text, date),
  public.change_stage(uuid, public.lead_stage, uuid, date, timestamptz),
  public.check_in_visit(uuid, text, date), public.attach_activity_photo(uuid, text),
  public.find_phone(text), public.today_list(),
  public.search_leads(text, uuid, public.lead_stage, uuid, uuid, date, date, boolean, int, int),
  public.transfer_leads(uuid, uuid)
to authenticated;

-- ---------------------------------------------------------------
-- Storage: site-visit photos, private. Path: <lead id>/<file name>.jpg
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('visit-photos', 'visit-photos', false, 2097152, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do nothing;

create policy visit_photos_select on storage.objects for select to authenticated
  using (bucket_id = 'visit-photos' and public.can_see_lead(((storage.foldername(name))[1])::uuid));
create policy visit_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'visit-photos' and public.can_edit_lead(((storage.foldername(name))[1])::uuid));
