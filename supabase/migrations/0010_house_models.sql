-- 0010 House models of each project (แบบบ้าน), with a picture and a category. Run after 0009.
--
-- A plot (unit) points to its model. The Excel import still fills units.house_type as text;
-- a trigger links the plot to the model whose name appears in that text ("บ้านเดี่ยว แบบ Ivy" -> Ivy).

create type public.house_category as enum ('detached', 'semi_detached', 'townhome', 'shophouse');

create table public.house_models (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects on delete cascade,
  name text not null check (trim(name) <> ''), -- e.g. Ivy
  category public.house_category not null,
  bedrooms int check (bedrooms >= 0),
  bathrooms int check (bathrooms >= 0),
  parking int check (parking >= 0),
  usable_sqm numeric(10, 2),
  land_from_sqw numeric(10, 2),
  price_from numeric(14, 2),
  description text not null default '',
  -- file in the "project-images" bucket: <project_id>/models/<model_id>-<timestamp>.jpg
  image_path text,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  unique (project_id, name)
);
create index house_models_project_idx on public.house_models (project_id, sort);

alter table public.units add column house_model_id uuid references public.house_models on delete set null;
create index units_house_model_idx on public.units (house_model_id);

-- ---------------------------------------------------------------
-- Matching a plot's house_type text to a model
-- ---------------------------------------------------------------

-- The model of this project whose name appears in the text (case-insensitive). Longest name wins,
-- so "Ivy Plus" beats "Ivy". Null when nothing matches.
create function public.house_model_for(p_project uuid, p_house_type text) returns uuid
language sql stable security definer set search_path = '' as $$
  select m.id
  from public.house_models m
  where m.project_id = p_project
    and trim(coalesce(p_house_type, '')) <> ''
    and strpos(lower(p_house_type), lower(trim(m.name))) > 0
  order by length(trim(m.name)) desc, m.name
  limit 1
$$;

-- Before a plot is saved: fill house_model_id from house_type when it is empty,
-- and refuse a model that belongs to another project. When an update (e.g. a new Excel import)
-- changes house_type but does not set the model itself, the model follows the new text.
create function public.units_link_house_model() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.house_type is distinct from old.house_type
    and new.house_model_id is not distinct from old.house_model_id then
    new.house_model_id := public.house_model_for(new.project_id, new.house_type);
  elsif new.house_model_id is null and trim(coalesce(new.house_type, '')) <> '' then
    new.house_model_id := public.house_model_for(new.project_id, new.house_type);
  elsif new.house_model_id is not null
    and not exists (select 1 from public.house_models m where m.id = new.house_model_id and m.project_id = new.project_id) then
    raise exception 'house model of another project';
  end if;
  return new;
end
$$;
create trigger units_link_house_model before insert or update on public.units
  for each row execute function public.units_link_house_model();

-- A new or renamed model picks up the plots of its project that have no model yet.
create function public.house_models_backfill_units() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.units u
  set house_model_id = public.house_model_for(u.project_id, u.house_type)
  where u.project_id = new.project_id
    and u.house_model_id is null
    and trim(u.house_type) <> ''
    and strpos(lower(u.house_type), lower(trim(new.name))) > 0;
  return null;
end
$$;
create trigger house_models_backfill_units after insert or update of name on public.house_models
  for each row execute function public.house_models_backfill_units();

-- ---------------------------------------------------------------
-- unit_board(): same columns and order as 0004, plus the model at the end
-- ---------------------------------------------------------------
drop function public.unit_board(uuid);

create function public.unit_board(p_project uuid)
returns table (
  id uuid, code text, zone text, house_type text, land_sqw numeric, usable_sqm numeric, price numeric,
  status public.unit_status, note text, plan_id uuid, pos_x real, pos_y real,
  interest_count int, lead_id uuid, lead_name text, holder_name text, mine boolean, updated_at timestamptz,
  house_model_id uuid, model_name text, model_category public.house_category
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
    u.updated_at,
    m.id, m.name, m.category
  from public.units u
  left join public.leads l on l.id = u.lead_id
  left join public.profiles p on p.id = l.owner_id
  left join public.house_models m on m.id = u.house_model_id
  where u.project_id = p_project and public.can_see_project(p_project)
  order by u.zone, u.code
$$;

-- ---------------------------------------------------------------
-- Row Level Security and access
-- ---------------------------------------------------------------
alter table public.house_models enable row level security;

create policy house_models_select on public.house_models for select to authenticated
  using (public.can_see_project(project_id));
create policy house_models_admin on public.house_models for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.house_models to authenticated;
grant all on public.house_models to service_role;

revoke execute on function
  public.house_model_for(uuid, text), public.units_link_house_model(), public.house_models_backfill_units(),
  public.unit_board(uuid)
from public, anon;
grant execute on function public.house_model_for(uuid, text), public.unit_board(uuid) to authenticated, service_role;

-- Pictures use the existing private "project-images" bucket (0007): the first folder is the
-- project id, so its policies already cover <project_id>/models/... files.
