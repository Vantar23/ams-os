-- Conteos de asistencia reportados por capitanes sobre sus áreas asignadas.
-- A diferencia del acomodador (cuya asignación fija área y sesión), el
-- capitán elige día y sesión al reportar. La tabla es append-only: el
-- conteo vigente por área+slot es la fila más reciente.

create table if not exists public.conteos_capitan (
  id uuid primary key default gen_random_uuid(),
  asamblea_id uuid not null references public.asambleas(id) on delete cascade,
  capitan_id uuid not null references public.capitanes(id) on delete cascade,
  area_id uuid not null references public.areas(id) on delete cascade,
  slot text not null check (slot in (
    'viernes-manana', 'viernes-tarde',
    'sabado-manana', 'sabado-tarde',
    'domingo-manana', 'domingo-tarde'
  )),
  valor int not null check (valor >= 0),
  reportado_at timestamptz not null default now()
);

create index if not exists conteos_capitan_asamblea_idx
  on public.conteos_capitan (asamblea_id, reportado_at desc);

create index if not exists conteos_capitan_area_slot_idx
  on public.conteos_capitan (area_id, slot, reportado_at desc);

alter table public.conteos_capitan enable row level security;

-- Cualquier miembro de la asamblea puede leer los conteos.
drop policy if exists "miembros_select_conteos_capitan" on public.conteos_capitan;
create policy "miembros_select_conteos_capitan"
  on public.conteos_capitan for select
  using (
    exists (
      select 1 from public.asamblea_miembros m
      where m.asamblea_id = conteos_capitan.asamblea_id
        and m.user_id = auth.uid()
    )
  );

-- El capitán reporta vía RPC: valida su sesión, que el área sea una de las
-- suyas (capitanes.area guarda etiquetas "piso — nombre") y que el valor no
-- exceda la capacidad cuando el área tiene capacidad fija.
create or replace function public.capitan_reportar_conteo(
  p_area_id uuid,
  p_slot text,
  p_valor int
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capitan_id uuid;
  v_asamblea_id uuid;
  v_capacidad int;
  v_id uuid;
begin
  select id, asamblea_id into v_capitan_id, v_asamblea_id
  from public.capitan_actual();
  if v_capitan_id is null then
    raise exception 'not_capitan';
  end if;

  if p_slot is null or p_slot not in (
    'viernes-manana', 'viernes-tarde',
    'sabado-manana', 'sabado-tarde',
    'domingo-manana', 'domingo-tarde'
  ) then
    raise exception 'invalid_slot';
  end if;
  if p_valor is null or p_valor < 0 then
    raise exception 'invalid_valor';
  end if;

  select a.capacidad into v_capacidad
  from public.areas a
  join public.capitanes c on c.id = v_capitan_id
  where a.id = p_area_id
    and a.asamblea_id = v_asamblea_id
    and (a.piso || ' — ' || a.nombre) = any(coalesce(c.area, '{}'));
  if not found then
    raise exception 'area_no_asignada';
  end if;

  if v_capacidad > 0 and p_valor > v_capacidad then
    raise exception 'excede_capacidad';
  end if;

  insert into public.conteos_capitan
    (asamblea_id, capitan_id, area_id, slot, valor)
  values
    (v_asamblea_id, v_capitan_id, p_area_id, p_slot, p_valor)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.capitan_reportar_conteo(uuid, text, int) from public;
grant execute on function public.capitan_reportar_conteo(uuid, text, int) to authenticated;
