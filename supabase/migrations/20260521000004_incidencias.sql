-- Incidencias: reportes durante la asamblea (médica, persona perdida,
-- bloqueo de paso, etc.). Cada incidencia tiene tipo, ubicación libre,
-- descripción opcional y una foto en el bucket privado `incidencias`.

create table if not exists public.incidencias (
  id uuid primary key default gen_random_uuid(),
  asamblea_id uuid not null references public.asambleas(id) on delete cascade,
  tipo text not null,
  ubicacion text,
  descripcion text,
  foto_path text,
  reportado_por_acomodador_id uuid references public.acomodadores(id) on delete set null,
  reportado_por_user_id uuid references auth.users(id) on delete set null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'en_proceso', 'resuelto')),
  created_at timestamptz not null default now()
);

create index if not exists incidencias_asamblea_idx
  on public.incidencias (asamblea_id, created_at desc);

alter table public.incidencias enable row level security;

-- Cualquier miembro de la asamblea puede leer la lista.
drop policy if exists "miembros_select_incidencias" on public.incidencias;
create policy "miembros_select_incidencias"
  on public.incidencias for select
  using (
    exists (
      select 1 from public.asamblea_miembros m
      where m.asamblea_id = incidencias.asamblea_id
        and m.user_id = auth.uid()
    )
  );

-- Owner y capitanes pueden crear/actualizar/eliminar (los acomodadores
-- pasan por server action con service role).
drop policy if exists "owner_capitan_insert_incidencias" on public.incidencias;
create policy "owner_capitan_insert_incidencias"
  on public.incidencias for insert
  with check (
    exists (
      select 1 from public.asamblea_miembros m
      where m.asamblea_id = incidencias.asamblea_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'capitan')
    )
  );

drop policy if exists "owner_capitan_update_incidencias" on public.incidencias;
create policy "owner_capitan_update_incidencias"
  on public.incidencias for update
  using (
    exists (
      select 1 from public.asamblea_miembros m
      where m.asamblea_id = incidencias.asamblea_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'capitan')
    )
  );

drop policy if exists "owner_capitan_delete_incidencias" on public.incidencias;
create policy "owner_capitan_delete_incidencias"
  on public.incidencias for delete
  using (
    exists (
      select 1 from public.asamblea_miembros m
      where m.asamblea_id = incidencias.asamblea_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'capitan')
    )
  );

-- Bucket privado para fotos. Las subidas y las URLs firmadas se hacen vía
-- service role desde el servidor.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'incidencias',
    'incidencias',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  )
  on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;
