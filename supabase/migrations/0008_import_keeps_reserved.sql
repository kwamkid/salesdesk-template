-- 0008 Re-importing the plot list never changes the status of a plot a customer holds.
-- Run after 0007.

create or replace function public.import_units(p_project uuid, p_rows jsonb) returns jsonb
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
        -- a plot held by a customer keeps its status; change it on the plot page instead
        status = case when u.lead_id is not null or coalesce(trim(r ->> 'status'), '') = '' then u.status else excluded.status end,
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
