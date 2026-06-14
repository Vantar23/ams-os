-- Devuelve también el nombre del portador (si se registró) al abrir un pase,
-- para mostrarlo en la credencial. Cambia el tipo de retorno, así que hay que
-- recrear la función (drop + create).
drop function if exists public.acceso_pase_open(text, text);

create or replace function public.acceso_pase_open(
  p_access_token text,
  p_device_key_hash text
) returns table(
  id uuid,
  area_nombre text,
  nombre text,
  asamblea_numero text,
  asamblea_edicion text,
  asamblea_titulo text,
  asamblea_fechas text,
  asamblea_sede text,
  is_unbound boolean,
  created_at timestamptz,
  device_bound_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.accesos_pases;
  v_area public.accesos_areas;
  v_a public.asambleas;
begin
  select * into v from public.accesos_pases p where p.access_token = p_access_token;
  if not found then
    raise exception 'invalid_access_token';
  end if;

  if v.device_bound_at is not null and v.device_key_hash <> p_device_key_hash then
    raise exception 'device_mismatch';
  end if;

  select * into v_area from public.accesos_areas a where a.id = v.area_id;
  select * into v_a from public.asambleas a where a.id = v.asamblea_id;

  return query
    select v.id, v_area.nombre, v.nombre,
           v_a.numero, v_a.edicion, v_a.titulo, v_a.fechas, v_a.sede,
           (v.device_bound_at is null) as is_unbound,
           v.created_at, v.device_bound_at;
end;
$$;

revoke all on function public.acceso_pase_open(text, text) from public;
grant execute on function public.acceso_pase_open(text, text) to anon, authenticated;
