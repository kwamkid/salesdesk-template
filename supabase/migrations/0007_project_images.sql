-- 0007 Project cover picture and plot counts per project. Run after 0006.

-- Cover picture of a project: a file in the "project-images" storage bucket,
-- stored as <project_id>/cover-<timestamp>.jpg
alter table public.projects add column cover_path text;

-- Plot counts of every project the caller can see, in one call (the /projects cards).
-- Runs with the caller's rights, so Row Level Security on units decides what is counted.
create function public.project_unit_counts()
returns table (
  project_id uuid, total int, available int, interested int, reserved int, contracted int, transferred int,
  free_value numeric
)
language sql stable security invoker set search_path = '' as $$
  select
    u.project_id,
    count(*)::int,
    count(*) filter (where u.status = 'available')::int,
    count(*) filter (where u.status = 'interested')::int,
    count(*) filter (where u.status = 'reserved')::int,
    count(*) filter (where u.status = 'contracted')::int,
    count(*) filter (where u.status = 'transferred')::int,
    coalesce(sum(u.price) filter (where u.status in ('available', 'interested')), 0)
  from public.units u
  group by u.project_id
$$;

-- Private bucket: everyone who can see the project can view its pictures; only admins add or remove them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-images', 'project-images', false, 5242880, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do nothing;

create policy project_images_files_select on storage.objects for select to authenticated
  using (bucket_id = 'project-images' and public.can_see_project(((storage.foldername(name))[1])::uuid));
create policy project_images_files_admin on storage.objects for all to authenticated
  using (bucket_id = 'project-images' and public.is_admin())
  with check (bucket_id = 'project-images' and public.is_admin());

revoke execute on function public.project_unit_counts() from public, anon;
grant execute on function public.project_unit_counts() to authenticated, service_role;
