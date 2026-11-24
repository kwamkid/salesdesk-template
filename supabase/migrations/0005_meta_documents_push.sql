-- 0005 Company settings, Meta Conversions API queue, issued documents, push notifications.
-- Run after 0004.

-- ---------------------------------------------------------------
-- Company settings (one row) and the Meta token (server only)
-- ---------------------------------------------------------------
create table public.company_settings (
  id int primary key default 1 check (id = 1),
  company_name text not null default '',
  company_address text not null default '',
  company_phone text not null default '',
  company_tax_id text not null default '',
  pixel_id text not null default '',
  test_event_code text not null default '', -- from Events Manager > Test events
  updated_at timestamptz not null default now()
);
insert into public.company_settings (id) values (1);

-- The Conversions API token. No policy and no grant: only the server (secret key) can read it.
create table public.meta_secrets (
  id int primary key default 1 check (id = 1),
  capi_token text not null default ''
);
insert into public.meta_secrets (id) values (1);
alter table public.meta_secrets enable row level security;

create function public.set_meta_token(p_token text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  update public.meta_secrets set capi_token = trim(coalesce(p_token, '')) where id = 1;
end
$$;

-- The settings page shows "token saved" without ever reading the token back.
create function public.meta_token_set() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() and (select capi_token <> '' from public.meta_secrets where id = 1)
$$;

-- ---------------------------------------------------------------
-- Meta events: one row per stage change worth reporting. The server sends pending rows
-- right after the change, and the cron job retries the ones that failed.
-- ---------------------------------------------------------------
create table public.meta_events (
  id bigint generated always as identity primary key,
  lead_id uuid not null references public.leads on delete cascade,
  project_id uuid not null references public.projects on delete cascade,
  stage public.lead_stage not null,
  event_name text not null,
  value numeric(14, 2),
  event_time timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts int not null default 0,
  error text not null default '',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index meta_events_status_idx on public.meta_events (status, created_at);

-- Default event name per stage. The admin can rename them per project in Settings.
create function public.default_event_name(s public.lead_stage) returns text
language sql immutable set search_path = '' as $$
  select case s
    when 'new' then 'Lead'
    when 'qualified' then 'QualifiedLead'
    when 'appointment' then 'Schedule'
    when 'visited' then 'SiteVisit'
    when 'reserved' then 'Reservation'
    when 'contracted' then 'Contract'
    when 'transferred' then 'Purchase'
  end
$$;

create function public.queue_meta_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  l public.leads;
  st public.stage_settings;
  v_value numeric;
begin
  if new.to_stage in ('lost', 'unqualified') then return null; end if;
  if (select pixel_id from public.company_settings where id = 1) = '' then return null; end if;

  select * into l from public.leads where id = new.lead_id;
  select * into st from public.stage_settings where project_id = l.project_id and stage = new.to_stage;
  if found and not st.send_event then return null; end if;

  v_value := st.value;
  -- reservation, contract and transfer carry the price of the customer's plot when there is one
  if new.to_stage in ('reserved', 'contracted', 'transferred') then
    v_value := coalesce((select max(price) from public.units where lead_id = l.id), v_value);
  end if;

  insert into public.meta_events (lead_id, project_id, stage, event_name, value, event_time)
  values (l.id, l.project_id, new.to_stage,
          coalesce(nullif(st.event_name, ''), public.default_event_name(new.to_stage)), v_value, new.changed_at);
  return null;
end
$$;
create trigger queue_meta_event after insert on public.stage_history
  for each row execute function public.queue_meta_event();

-- ---------------------------------------------------------------
-- Documents issued from company templates (the templates live in src/documents/)
-- ---------------------------------------------------------------
-- Which document each stage can issue. The admin changes it in Settings.
create table public.stage_documents (
  stage public.lead_stage not null,
  doc_key text not null,
  primary key (stage, doc_key)
);
insert into public.stage_documents (stage, doc_key) values
  ('qualified', 'quotation'), ('appointment', 'quotation'), ('visited', 'quotation'),
  ('reserved', 'reservation'), ('reserved', 'quotation');

create table public.issued_documents (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads on delete cascade,
  doc_key text not null,
  doc_no text not null,
  data jsonb not null default '{}', -- the values printed, kept as they were on the day
  issued_by uuid default auth.uid() references public.profiles on delete set null,
  issued_at timestamptz not null default now(),
  unique (doc_key, doc_no)
);
create index issued_documents_lead_idx on public.issued_documents (lead_id, issued_at desc);

-- Save an issued document and give it a running number per document type and Thai year,
-- e.g. RS-2569-0001. p_prefix comes from the template.
create function public.issue_document(p_lead uuid, p_doc_key text, p_prefix text, p_data jsonb)
returns table (id uuid, doc_no text)
language plpgsql security definer set search_path = '' as $$
declare
  v_year text := (extract(year from public.today_th())::int + 543)::text;
  v_no text;
  v_id uuid;
begin
  if not public.can_edit_lead(p_lead) then raise exception 'not allowed'; end if;
  perform pg_advisory_xact_lock(hashtext('doc:' || p_doc_key));
  select upper(p_prefix) || '-' || v_year || '-' ||
         lpad((count(*) + 1)::text, 4, '0')
    into v_no
    from public.issued_documents d
    where d.doc_key = p_doc_key and d.doc_no like upper(p_prefix) || '-' || v_year || '-%';
  insert into public.issued_documents (lead_id, doc_key, doc_no, data)
  values (p_lead, p_doc_key, v_no, coalesce(p_data, '{}'))
  returning issued_documents.id into v_id;
  return query select v_id, v_no;
end
$$;

-- ---------------------------------------------------------------
-- Notifications: in-app list + Web Push
-- ---------------------------------------------------------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

create table public.notification_prefs (
  user_id uuid primary key default auth.uid() references public.profiles on delete cascade,
  daily_digest boolean not null default true,
  digest_hour smallint not null default 8 check (digest_hour between 0 and 23),
  instant boolean not null default true,
  quiet_from smallint check (quiet_from between 0 and 23), -- no push from this hour ...
  quiet_to smallint check (quiet_to between 0 and 23),     -- ... until this hour
  project_ids uuid[], -- executives: projects to hear about; null = all
  last_digest_on date
);

-- kind: 'task' = something to do (shown in the badge count) · 'info' = news only
create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  kind text not null default 'info' check (kind in ('task', 'info')),
  title text not null,
  body text not null default '',
  url text not null default '/',
  dedupe_key text, -- the same reminder is never created twice
  read_at timestamptz,
  pushed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_push_idx on public.notifications (created_at) where pushed_at is null;

create function public.notify(
  p_user uuid, p_kind text, p_title text, p_body text, p_url text, p_dedupe text default null
) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, kind, title, body, url, dedupe_key)
  values (p_user, p_kind, p_title, coalesce(p_body, ''), coalesce(p_url, '/'), p_dedupe)
  on conflict (user_id, dedupe_key) do nothing
$$;

-- A lead is handed to a sales person (new lead from the website, or moved by the admin)
create function public.notify_lead_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(current_setting('salesdesk.bulk_transfer', true), '') = 'on' then return null; end if;
  if new.owner_id is not null
     and new.owner_id is distinct from auth.uid()
     and (tg_op = 'INSERT' or new.owner_id is distinct from old.owner_id) then
    perform public.notify(new.owner_id, 'task',
      '[' || (select name from public.projects where id = new.project_id) || '] ลีดใหม่: ' || new.full_name,
      'กดเพื่อดูข้อมูลและโทรหาลูกค้า', '/leads/' || new.id, 'lead-owner:' || new.id || ':' || new.owner_id);
  end if;
  return null;
end
$$;
create trigger notify_lead_owner after insert or update of owner_id on public.leads
  for each row execute function public.notify_lead_owner();

-- Reservation, contract or transfer: tell the executives who follow that project
create function public.notify_deal() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  l public.leads;
  v_label text;
begin
  if new.to_stage not in ('reserved', 'contracted', 'transferred') then return null; end if;
  select * into l from public.leads where id = new.lead_id;
  v_label := case new.to_stage when 'reserved' then 'จองแล้ว' when 'contracted' then 'ทำสัญญาแล้ว' else 'โอนแล้ว' end;
  perform public.notify(p.id, 'info',
    '[' || pr.name || '] ' || v_label || ' 1 ราย',
    l.full_name || ' โดยเซลส์ ' || coalesce(nullif(o.full_name, ''), '-'),
    '/leads/' || l.id, 'deal:' || new.id)
  from public.profiles p
  join public.projects pr on pr.id = l.project_id
  left join public.profiles o on o.id = l.owner_id
  left join public.notification_prefs np on np.user_id = p.id
  where p.role = 'executive' and p.status = 'active'
    and (np.project_ids is null or l.project_id = any (np.project_ids))
    and (exists (select 1 from public.project_members m where m.user_id = p.id and m.project_id = l.project_id)
         or not exists (select 1 from public.project_members m where m.user_id = p.id));
  return null;
end
$$;
create trigger notify_deal after insert on public.stage_history
  for each row execute function public.notify_deal();

-- Someone signed up without an invite: tell every admin
create function public.notify_pending_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'pending' then
    perform public.notify(a.id, 'task', 'มีผู้ใช้ใหม่รออนุมัติ 1 ราย',
      coalesce(nullif(new.full_name, ''), new.email), '/queue', 'pending:' || new.id)
    from public.profiles a where a.role = 'admin' and a.status = 'active';
  end if;
  return null;
end
$$;
create trigger notify_pending_user after insert on public.profiles
  for each row execute function public.notify_pending_user();

-- The number on the app icon = work still to do (it goes down when the work is done).
--   sales: overdue + due today + new leads never contacted
--   executive: overdue follow-ups of the whole team (projects they follow)
--   admin: users waiting + leads with no owner + Meta events that failed
create function public.badge_count(p_user uuid default null) returns int
language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := coalesce(p_user, auth.uid());
  v_role public.user_role;
  v_projects uuid[];
begin
  if auth.uid() is not null and v_user <> auth.uid() then raise exception 'not allowed'; end if;
  select role into v_role from public.profiles where id = v_user and status = 'active';
  if v_role = 'sales' then
    return (select count(*) from public.leads
            where owner_id = v_user and public.is_open_stage(stage)
              and (next_follow_up <= public.today_th() or first_contact_at is null));
  elsif v_role = 'executive' then
    select project_ids into v_projects from public.notification_prefs where user_id = v_user;
    return (select count(*) from public.leads
            where public.is_open_stage(stage) and next_follow_up < public.today_th()
              and (v_projects is null or project_id = any (v_projects)));
  elsif v_role = 'admin' then
    return (select count(*) from public.profiles where status = 'pending')
         + (select count(*) from public.leads where owner_id is null and public.is_open_stage(stage))
         + (select count(*) from public.meta_events where status = 'failed');
  end if;
  return 0;
end
$$;

-- ---------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------
alter table public.company_settings enable row level security;
alter table public.meta_events enable row level security;
alter table public.stage_documents enable row level security;
alter table public.issued_documents enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_prefs enable row level security;
alter table public.notifications enable row level security;

create policy company_select on public.company_settings for select to authenticated using (public.my_role() is not null);
create policy company_admin on public.company_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy meta_events_admin on public.meta_events for select to authenticated using (public.is_admin());

create policy stage_documents_select on public.stage_documents for select to authenticated using (public.my_role() is not null);
create policy stage_documents_admin on public.stage_documents for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy issued_documents_select on public.issued_documents for select to authenticated using (public.can_see_lead(lead_id));

create policy push_own on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy prefs_own on public.notification_prefs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_own_select on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_own_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, update on public.company_settings to authenticated;
grant select on public.meta_events, public.issued_documents to authenticated;
grant select, insert, update, delete on public.stage_documents, public.push_subscriptions, public.notification_prefs to authenticated;
grant select, update (read_at) on public.notifications to authenticated;

revoke execute on all functions in schema public from public, anon;
grant execute on function public.invite_info(uuid) to anon, authenticated;
grant execute on function
  public.set_meta_token(text), public.meta_token_set(), public.default_event_name(public.lead_stage),
  public.issue_document(uuid, text, text, jsonb), public.badge_count(uuid)
to authenticated;
