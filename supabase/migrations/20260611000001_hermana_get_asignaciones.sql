-- RPC para que una hermana de apoyo consulte sus puestos asignados desde su
-- enlace personal, igual que `acomodador_get_asignaciones`.

create or replace function public.hermana_get_asignaciones(
  p_access_token text,
  p_device_key_hash text
)
returns table(
  asignacion_id uuid,
  slot text,
  area_id uuid,
  area_piso text,
  area_nombre text,
  area_filas int,
  area_capacidad int
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
begin
  select h.id into v_id from public.hermanas_apoyo h
  where h.access_token = p_access_token
    and h.device_bound_at is not null
    and h.device_key_hash = p_device_key_hash;
  if v_id is null then raise exception 'invalid_access_token'; end if;

  return query
    select s.id,
           s.slot,
           ar.id,
           ar.piso,
           ar.nombre,
           ar.filas,
           ar.capacidad
    from public.asignaciones_hermanas s
    join public.areas ar on ar.id = s.area_id
    where s.hermana_apoyo_id = v_id
    order by s.slot;
end;
$function$;
