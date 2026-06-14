-- Conteos de asistencia capturados manualmente por administración (owner).
-- Antes vivían solo en localStorage del dispositivo del owner, así que no se
-- veían en otros dispositivos ni en el enlace público. Ahora se guardan en la
-- base para que el panel y la vista pública muestren los mismos totales.
-- El conteo vigente por área+slot es la fila más reciente.

create table if not exists public.conteos_admin (
  id uuid primary key default gen_random_uuid(),
  asamblea_id uuid not null references public.asambleas(id) on delete cascade,
  area_id uuid not null references public.areas(id) on delete cascade,
  slot text not null check (slot in (
    'viernes-manana', 'viernes-tarde',
    'sabado-manana', 'sabado-tarde',
    'domingo-manana', 'domingo-tarde'
  )),
  valor int not null check (valor >= 0),
  reportado_por uuid,
  reportado_at timestamptz not null default now()
);

create index if not exists conteos_admin_asamblea_idx
  on public.conteos_admin (asamblea_id, reportado_at desc);
create index if not exists conteos_admin_area_slot_idx
  on public.conteos_admin (area_id, slot, reportado_at desc);

alter table public.conteos_admin enable row level security;

-- Los miembros de la asamblea gestionan los conteos manuales. La vista pública
-- entra por service role, no por estas policies.
drop policy if exists conteos_admin_miembros on public.conteos_admin;
create policy conteos_admin_miembros on public.conteos_admin
  for all
  using (public.is_asamblea_miembro(asamblea_id))
  with check (public.is_asamblea_miembro(asamblea_id));
