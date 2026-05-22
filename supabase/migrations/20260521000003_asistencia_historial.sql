-- Historial de reportes de asistencia. Cada vez que un acomodador o un
-- admin/capitán cambia el conteo (lugares vacíos) de una asignación
-- guardamos una fila aquí, para poder mostrar la línea de tiempo en la
-- vista de administrador y poder "regresar" a un punto del historial.
--
-- El reporte vigente sigue viviendo en public.asignaciones.lugares_vacios
-- y .reportado_at — esta tabla es solo append-only.

create table if not exists public.asistencia_historial (
  id uuid primary key default gen_random_uuid(),
  asignacion_id uuid not null references public.asignaciones(id) on delete cascade,
  asamblea_id uuid not null references public.asambleas(id) on delete cascade,
  lugares_vacios int not null check (lugares_vacios >= 0),
  origen text not null check (origen in ('acomodador', 'admin', 'revert')),
  reportado_por_acomodador_id uuid references public.acomodadores(id) on delete set null,
  reportado_por_user_id uuid references auth.users(id) on delete set null,
  revert_from_id uuid references public.asistencia_historial(id) on delete set null,
  reportado_at timestamptz not null default now()
);

create index if not exists asistencia_historial_asignacion_idx
  on public.asistencia_historial (asignacion_id, reportado_at desc);

create index if not exists asistencia_historial_asamblea_idx
  on public.asistencia_historial (asamblea_id, reportado_at desc);

alter table public.asistencia_historial enable row level security;

-- Cualquier miembro de la asamblea puede leer el historial.
drop policy if exists "miembros_select_asistencia_historial"
  on public.asistencia_historial;
create policy "miembros_select_asistencia_historial"
  on public.asistencia_historial for select
  using (
    exists (
      select 1 from public.asamblea_miembros m
      where m.asamblea_id = asistencia_historial.asamblea_id
        and m.user_id = auth.uid()
    )
  );

-- Seed: cargar el reporte vigente actual como primera entrada del historial
-- por cada asignación que ya tenga un valor reportado, así la UI muestra
-- algo desde el primer despliegue.
insert into public.asistencia_historial
  (asignacion_id, asamblea_id, lugares_vacios, origen, reportado_por_acomodador_id, reportado_at)
select
  a.id,
  a.asamblea_id,
  a.lugares_vacios,
  'acomodador',
  a.acomodador_id,
  coalesce(a.reportado_at, now())
from public.asignaciones a
where a.lugares_vacios is not null
  and not exists (
    select 1 from public.asistencia_historial h
    where h.asignacion_id = a.id
  );

-- RPC para regresar a un punto del historial. Inserta una nueva entrada con
-- el valor del registro objetivo y actualiza public.asignaciones para que
-- ese sea el reporte vigente. Solo owner/capitán pueden revertir.
create or replace function public.asistencia_revertir(
  p_historial_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target record;
  v_role text;
begin
  select h.id, h.asignacion_id, h.asamblea_id, h.lugares_vacios
    into v_target
    from public.asistencia_historial h
    where h.id = p_historial_id;
  if not found then
    raise exception 'historial_not_found';
  end if;

  select m.role into v_role
    from public.asamblea_miembros m
    where m.asamblea_id = v_target.asamblea_id
      and m.user_id = auth.uid();
  if v_role is null or v_role not in ('owner', 'capitan') then
    raise exception 'forbidden';
  end if;

  insert into public.asistencia_historial
    (asignacion_id, asamblea_id, lugares_vacios, origen,
     reportado_por_user_id, revert_from_id)
  values
    (v_target.asignacion_id, v_target.asamblea_id, v_target.lugares_vacios,
     'revert', auth.uid(), v_target.id);

  update public.asignaciones
    set lugares_vacios = v_target.lugares_vacios,
        reportado_at = now()
    where id = v_target.asignacion_id;
end;
$$;

revoke all on function public.asistencia_revertir(uuid) from public;
grant execute on function public.asistencia_revertir(uuid) to authenticated;
