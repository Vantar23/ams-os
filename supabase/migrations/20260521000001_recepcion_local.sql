-- Recepción del local: items reportados al recibir el lugar de la asamblea.
-- Cada item tiene categoría (libre), descripción opcional y opcionalmente
-- una foto en el bucket privado `recepcion-local`.

create table if not exists public.recepcion_local_items (
  id uuid primary key default gen_random_uuid(),
  asamblea_id uuid not null references public.asambleas(id) on delete cascade,
  categoria text not null,
  descripcion text,
  foto_path text,
  reportado_por_acomodador_id uuid references public.acomodadores(id) on delete set null,
  reportado_por_user_id uuid references auth.users(id) on delete set null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'en_proceso', 'resuelto')),
  created_at timestamptz not null default now()
);

create index if not exists recepcion_local_items_asamblea_idx
  on public.recepcion_local_items (asamblea_id, created_at desc);

alter table public.recepcion_local_items enable row level security;

-- Cualquier miembro de la asamblea puede leer la lista.
drop policy if exists "miembros_select_recepcion" on public.recepcion_local_items;
create policy "miembros_select_recepcion"
  on public.recepcion_local_items for select
  using (
    exists (
      select 1 from public.asamblea_miembros m
      where m.asamblea_id = recepcion_local_items.asamblea_id
        and m.user_id = auth.uid()
    )
  );

-- Owner y capitanes pueden crear/actualizar/eliminar (los acomodadores
-- pasan por server action con service role).
drop policy if exists "owner_capitan_insert_recepcion" on public.recepcion_local_items;
create policy "owner_capitan_insert_recepcion"
  on public.recepcion_local_items for insert
  with check (
    exists (
      select 1 from public.asamblea_miembros m
      where m.asamblea_id = recepcion_local_items.asamblea_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'capitan')
    )
  );

drop policy if exists "owner_capitan_update_recepcion" on public.recepcion_local_items;
create policy "owner_capitan_update_recepcion"
  on public.recepcion_local_items for update
  using (
    exists (
      select 1 from public.asamblea_miembros m
      where m.asamblea_id = recepcion_local_items.asamblea_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'capitan')
    )
  );

drop policy if exists "owner_capitan_delete_recepcion" on public.recepcion_local_items;
create policy "owner_capitan_delete_recepcion"
  on public.recepcion_local_items for delete
  using (
    exists (
      select 1 from public.asamblea_miembros m
      where m.asamblea_id = recepcion_local_items.asamblea_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'capitan')
    )
  );

-- Bucket privado para fotos. Las subidas y las URLs firmadas se hacen vía
-- service role desde el servidor, así que no se requieren policies de
-- storage.objects para este flujo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'recepcion-local',
    'recepcion-local',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  )
  on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;
