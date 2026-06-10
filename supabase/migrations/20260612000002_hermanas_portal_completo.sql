-- Las hermanas de apoyo obtienen el mismo portal que los acomodadores:
-- pueden reportar incidencias y recepción del local, y consultar los mapas.

alter table public.incidencias
  add column if not exists reportado_por_hermana_id uuid
    references public.hermanas_apoyo(id) on delete set null;

alter table public.recepcion_local_items
  add column if not exists reportado_por_hermana_id uuid
    references public.hermanas_apoyo(id) on delete set null;

-- Mapas del recinto desde el enlace personal de una hermana de apoyo,
-- espejo de `acceso_mapas` para acomodadores.
create or replace function public.hermana_acceso_mapas(p_access_token text)
returns table(
  id uuid,
  nombre text,
  descripcion text,
  storage_path text
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_asamblea_id uuid;
begin
  select h.asamblea_id into v_asamblea_id
  from public.hermanas_apoyo h
  where h.access_token = p_access_token;
  if v_asamblea_id is null then raise exception 'invalid_access_token'; end if;

  return query
    select m.id, m.nombre, m.descripcion, m.storage_path
    from public.mapas m
    where m.asamblea_id = v_asamblea_id
    order by m.created_at;
end;
$function$;
