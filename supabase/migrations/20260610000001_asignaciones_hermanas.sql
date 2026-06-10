-- Puestos para hermanas de apoyo. Replica el modelo de `asignaciones`
-- (acomodadores) pero en una tabla aparte, para que las hermanas se asignen
-- a las mismas áreas y turnos sin mezclarse con los acomodadores.
--
-- Cada área tiene además su propio cupo de hermanas necesarias, separado de
-- `acomodadores_necesarios`.

-- Cupo de hermanas por área ------------------------------------------------
alter table public.areas
  add column if not exists hermanas_necesarias int not null default 0;

-- Tabla de asignaciones de hermanas ----------------------------------------
create table if not exists public.asignaciones_hermanas (
  id uuid primary key default gen_random_uuid(),
  asamblea_id uuid not null references public.asambleas(id) on delete cascade,
  area_id uuid not null references public.areas(id) on delete cascade,
  hermana_apoyo_id uuid not null references public.hermanas_apoyo(id) on delete cascade,
  slot text not null,
  created_at timestamptz not null default now(),
  -- Una hermana solo puede tener un puesto por turno (slot).
  unique (hermana_apoyo_id, slot)
);

create index if not exists asignaciones_hermanas_asamblea_idx
  on public.asignaciones_hermanas (asamblea_id);

create index if not exists asignaciones_hermanas_area_idx
  on public.asignaciones_hermanas (area_id, slot);

alter table public.asignaciones_hermanas enable row level security;

-- Cualquier miembro de la asamblea puede leer las asignaciones.
drop policy if exists "miembros_select_asignaciones_hermanas"
  on public.asignaciones_hermanas;
create policy "miembros_select_asignaciones_hermanas"
  on public.asignaciones_hermanas for select
  using (
    exists (
      select 1 from public.asamblea_miembros m
      where m.asamblea_id = asignaciones_hermanas.asamblea_id
        and m.user_id = auth.uid()
    )
  );

-- Owner, capitanes, superintendentes y auxiliares pueden asignar/quitar.
drop policy if exists "owner_capitan_insert_asignaciones_hermanas"
  on public.asignaciones_hermanas;
create policy "owner_capitan_insert_asignaciones_hermanas"
  on public.asignaciones_hermanas for insert
  with check (
    exists (
      select 1 from public.asamblea_miembros m
      where m.asamblea_id = asignaciones_hermanas.asamblea_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'capitan', 'subcapitan', 'auxiliar')
    )
  );

drop policy if exists "owner_capitan_update_asignaciones_hermanas"
  on public.asignaciones_hermanas;
create policy "owner_capitan_update_asignaciones_hermanas"
  on public.asignaciones_hermanas for update
  using (
    exists (
      select 1 from public.asamblea_miembros m
      where m.asamblea_id = asignaciones_hermanas.asamblea_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'capitan', 'subcapitan', 'auxiliar')
    )
  );

drop policy if exists "owner_capitan_delete_asignaciones_hermanas"
  on public.asignaciones_hermanas;
create policy "owner_capitan_delete_asignaciones_hermanas"
  on public.asignaciones_hermanas for delete
  using (
    exists (
      select 1 from public.asamblea_miembros m
      where m.asamblea_id = asignaciones_hermanas.asamblea_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'capitan', 'subcapitan', 'auxiliar')
    )
  );
