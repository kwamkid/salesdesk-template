-- Audience list for Meta now also returns the customer's name, so the file can carry
-- fn / ln / country (Meta matches more people with them). Same groups and rights as 0006.
drop function if exists public.export_meta_audience(text, uuid);
create function public.export_meta_audience(p_group text, p_project uuid default null)
returns table (phone text, email text, full_name text)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if public.my_role() not in ('admin', 'executive') then raise exception 'not allowed'; end if;
  return query
    select distinct
      case when l.phone ~ '^0[0-9]{8,9}$' then '66' || substr(l.phone, 2) else l.phone end,
      l.email,
      l.full_name
    from public.leads l
    where (p_project is null or l.project_id = p_project)
      and case p_group
        when 'unqualified' then l.stage = 'unqualified'
        when 'lost' then l.stage = 'lost'
        when 'visited' then l.visited_at is not null
        when 'reserved' then l.stage in ('reserved', 'contracted', 'transferred')
        when 'all' then true
        else false
      end;
end
$$;
grant execute on function public.export_meta_audience(text, uuid) to authenticated;
