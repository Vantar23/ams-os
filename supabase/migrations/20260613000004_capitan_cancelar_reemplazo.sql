-- El capitán puede cancelar una solicitud de reemplazo si ya no la necesita
-- (p. ej. el acomodador llegó). Cancelar limpia la marca de asistencia, así el
-- puesto deja de aparecer en la cola de reemplazos de administración. Solo
-- aplica mientras la solicitud sigue pendiente: una vez que admin transfiere el
-- puesto, la fila ya pertenece al entrante y su asistencia queda en null.

create or replace function public.capitan_marcar_asistencia(
  p_asignacion_id uuid,
  p_estado text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capitan_id uuid;
  v_asamblea_id uuid;
begin
  select id, asamblea_id into v_capitan_id, v_asamblea_id
  from public.capitan_actual();
  if v_capitan_id is null then
    raise exception 'not_capitan';
  end if;

  if p_estado is null or p_estado not in (
    'presente', 'necesita_remplazo', 'cancelar'
  ) then
    raise exception 'invalid_estado';
  end if;

  if not exists (
    select 1
    from public.asignaciones asg
    join public.areas a on a.id = asg.area_id
    join public.capitanes c on c.id = v_capitan_id
    where asg.id = p_asignacion_id
      and asg.asamblea_id = v_asamblea_id
      and (a.piso || ' — ' || a.nombre) = any(coalesce(c.area, '{}'))
  ) then
    raise exception 'area_no_asignada';
  end if;

  if p_estado = 'cancelar' then
    update public.asignaciones
    set asistencia = null,
        asistencia_at = null,
        asistencia_por = null
    where id = p_asignacion_id;
  else
    update public.asignaciones
    set asistencia = p_estado,
        asistencia_at = now(),
        asistencia_por = v_capitan_id
    where id = p_asignacion_id;
  end if;
end;
$$;
