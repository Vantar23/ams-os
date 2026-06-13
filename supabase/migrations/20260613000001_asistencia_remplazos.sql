-- Pase de lista del capitán + sistema de reemplazos.
--
-- El capitán marca, por puesto del turno vigente, si el acomodador se presentó
-- ('presente') o necesita ser reemplazado ('necesita_remplazo'). La presencia
-- es un atributo del puesto (la fila de asignaciones, que ya fija área+sesión).
-- Administración ve los que necesitan reemplazo y transfiere el puesto a otro
-- acomodador, dejando registro del cambio en la tabla reemplazos.

-- 1) Presencia del acomodador en su puesto.
alter table public.asignaciones
  add column if not exists asistencia text
    check (asistencia in ('presente', 'necesita_remplazo')),
  add column if not exists asistencia_at timestamptz,
  add column if not exists asistencia_por uuid
    references public.capitanes(id) on delete set null;

-- 2) El capitán marca vía RPC: valida su sesión y que el puesto sea de una de
-- sus áreas (capitanes.area guarda etiquetas "piso — nombre"), igual que
-- capitan_reportar_conteo.
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

  if p_estado is null or p_estado not in ('presente', 'necesita_remplazo') then
    raise exception 'invalid_estado';
  end if;

  -- El puesto debe estar en la asamblea del capitán y en una de sus áreas.
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

  update public.asignaciones
  set asistencia = p_estado,
      asistencia_at = now(),
      asistencia_por = v_capitan_id
  where id = p_asignacion_id;
end;
$$;

revoke all on function public.capitan_marcar_asistencia(uuid, text) from public;
grant execute on function public.capitan_marcar_asistencia(uuid, text) to authenticated;

-- 3) Historial de reemplazos: quién salió, quién entró y en qué puesto.
create table if not exists public.reemplazos (
  id uuid primary key default gen_random_uuid(),
  asamblea_id uuid not null references public.asambleas(id) on delete cascade,
  area_id uuid not null references public.areas(id) on delete cascade,
  slot text not null check (slot in (
    'viernes-manana', 'viernes-tarde',
    'sabado-manana', 'sabado-tarde',
    'domingo-manana', 'domingo-tarde'
  )),
  saliente_id uuid not null references public.acomodadores(id) on delete cascade,
  entrante_id uuid not null references public.acomodadores(id) on delete cascade,
  realizado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists reemplazos_asamblea_idx
  on public.reemplazos (asamblea_id, created_at desc);

alter table public.reemplazos enable row level security;

drop policy if exists "reemplazos_member_all" on public.reemplazos;
create policy "reemplazos_member_all"
  on public.reemplazos for all
  using (public.is_asamblea_miembro(asamblea_id))
  with check (public.is_asamblea_miembro(asamblea_id));
