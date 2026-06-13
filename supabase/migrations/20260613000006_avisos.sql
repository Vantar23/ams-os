-- Avisos a pantalla completa y preguntas de 2 opciones. Administración lanza
-- un comunicado dirigido a acomodadores, capitanes y/o hermanas de apoyo; cada
-- persona lo ve a pantalla completa y lo marca como visto (o elige A/B en una
-- pregunta). Administración ve cuántos lo leyeron y el desglose de respuestas.
--
-- El personal (acomodador/hermana) no tiene sesión: lee y responde por RPC
-- security definer validando access_token + dispositivo, igual que `mensajes`.
-- Los capitanes resuelven su identidad de la sesión con `capitan_actual()`.

-- Aviso o pregunta. `audiencias` es un subconjunto de
-- {'acomodador','capitan','hermana'} (los mismos nombres que mensajes.persona_tipo).
create table if not exists public.avisos (
  id uuid primary key default gen_random_uuid(),
  asamblea_id uuid not null references public.asambleas(id) on delete cascade,
  tipo text not null check (tipo in ('aviso', 'pregunta')),
  titulo text not null check (char_length(titulo) between 1 and 200),
  cuerpo text check (cuerpo is null or char_length(cuerpo) <= 2000),
  opcion_a text check (opcion_a is null or char_length(opcion_a) between 1 and 120),
  opcion_b text check (opcion_b is null or char_length(opcion_b) between 1 and 120),
  audiencias text[] not null
    check (
      cardinality(audiencias) > 0
      and audiencias <@ array['acomodador', 'capitan', 'hermana']
    ),
  expira_at timestamptz,
  archivado boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  -- Una pregunta necesita ambas opciones; un aviso no las usa.
  constraint avisos_pregunta_opciones check (
    (tipo = 'pregunta' and opcion_a is not null and opcion_b is not null)
    or (tipo = 'aviso' and opcion_a is null and opcion_b is null)
  )
);

create index if not exists avisos_asamblea_idx
  on public.avisos (asamblea_id, created_at desc);

-- Una fila por persona por aviso: marca el "visto" y, en preguntas, la opción.
create table if not exists public.avisos_respuestas (
  id uuid primary key default gen_random_uuid(),
  aviso_id uuid not null references public.avisos(id) on delete cascade,
  persona_tipo text not null check (persona_tipo in ('acomodador', 'capitan', 'hermana')),
  persona_id uuid not null,
  opcion text check (opcion in ('a', 'b')),
  visto_at timestamptz not null default now(),
  unique (aviso_id, persona_tipo, persona_id)
);

create index if not exists avisos_respuestas_aviso_idx
  on public.avisos_respuestas (aviso_id);

alter table public.avisos enable row level security;
alter table public.avisos_respuestas enable row level security;

-- Cualquier miembro del panel puede leer los avisos y sus resultados.
drop policy if exists "miembros_select_avisos" on public.avisos;
create policy "miembros_select_avisos"
  on public.avisos for select
  using (
    exists (
      select 1 from public.asamblea_miembros m
      where m.asamblea_id = avisos.asamblea_id
        and m.user_id = auth.uid()
    )
  );

-- Solo owner / subcapitán / auxiliar crean, editan o archivan avisos. Los
-- capitanes solo los reciben.
drop policy if exists "admin_insert_avisos" on public.avisos;
create policy "admin_insert_avisos"
  on public.avisos for insert
  with check (
    exists (
      select 1 from public.asamblea_miembros m
      where m.asamblea_id = avisos.asamblea_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'subcapitan', 'auxiliar')
    )
  );

drop policy if exists "admin_update_avisos" on public.avisos;
create policy "admin_update_avisos"
  on public.avisos for update
  using (
    exists (
      select 1 from public.asamblea_miembros m
      where m.asamblea_id = avisos.asamblea_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'subcapitan', 'auxiliar')
    )
  );

drop policy if exists "admin_delete_avisos" on public.avisos;
create policy "admin_delete_avisos"
  on public.avisos for delete
  using (
    exists (
      select 1 from public.asamblea_miembros m
      where m.asamblea_id = avisos.asamblea_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'subcapitan', 'auxiliar')
    )
  );

-- Los miembros leen las respuestas (para los conteos). La inserción de
-- respuestas del personal va por RPC security definer; no hay policy de insert.
drop policy if exists "miembros_select_avisos_respuestas" on public.avisos_respuestas;
create policy "miembros_select_avisos_respuestas"
  on public.avisos_respuestas for select
  using (
    exists (
      select 1
      from public.avisos a
      join public.asamblea_miembros m on m.asamblea_id = a.asamblea_id
      where a.id = avisos_respuestas.aviso_id
        and m.user_id = auth.uid()
    )
  );

-- Resuelve persona del portal (acomodador/hermana) por token + dispositivo.
-- Devuelve también la asamblea para acotar los avisos. Igual patrón que
-- mensajes_listar_personal.
create or replace function public.avisos_persona_portal(
  p_tipo text,
  p_access_token text,
  p_device_key_hash text,
  out persona_id uuid,
  out asamblea_id uuid
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if p_tipo = 'acomodador' then
    select a.id, a.asamblea_id into persona_id, asamblea_id
    from public.acomodadores a
    where a.access_token = p_access_token
      and a.device_bound_at is not null
      and a.device_key_hash = p_device_key_hash;
  elsif p_tipo = 'hermana' then
    select h.id, h.asamblea_id into persona_id, asamblea_id
    from public.hermanas_apoyo h
    where h.access_token = p_access_token
      and h.device_bound_at is not null
      and h.device_key_hash = p_device_key_hash;
  else
    raise exception 'invalid_tipo';
  end if;
  if persona_id is null then raise exception 'invalid_access_token'; end if;
end;
$function$;

-- Avisos activos para el personal que aún no ha respondido.
create or replace function public.avisos_pendientes_personal(
  p_tipo text,
  p_access_token text,
  p_device_key_hash text
)
returns table(
  id uuid,
  tipo text,
  titulo text,
  cuerpo text,
  opcion_a text,
  opcion_b text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_persona_id uuid;
  v_asamblea_id uuid;
begin
  select p.persona_id, p.asamblea_id into v_persona_id, v_asamblea_id
  from public.avisos_persona_portal(p_tipo, p_access_token, p_device_key_hash) p;

  return query
    select a.id, a.tipo, a.titulo, a.cuerpo, a.opcion_a, a.opcion_b, a.created_at
    from public.avisos a
    where a.asamblea_id = v_asamblea_id
      and not a.archivado
      and (a.expira_at is null or a.expira_at > now())
      and p_tipo = any(a.audiencias)
      and not exists (
        select 1 from public.avisos_respuestas r
        where r.aviso_id = a.id
          and r.persona_tipo = p_tipo
          and r.persona_id = v_persona_id
      )
    order by a.created_at;
end;
$function$;

-- El personal marca un aviso como visto (o elige A/B en una pregunta).
create or replace function public.avisos_responder_personal(
  p_tipo text,
  p_access_token text,
  p_device_key_hash text,
  p_aviso_id uuid,
  p_opcion text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_persona_id uuid;
  v_asamblea_id uuid;
  v_aviso public.avisos%rowtype;
  v_opcion text;
begin
  select p.persona_id, p.asamblea_id into v_persona_id, v_asamblea_id
  from public.avisos_persona_portal(p_tipo, p_access_token, p_device_key_hash) p;

  select * into v_aviso from public.avisos a where a.id = p_aviso_id;
  if not found
    or v_aviso.asamblea_id <> v_asamblea_id
    or not (p_tipo = any(v_aviso.audiencias)) then
    raise exception 'aviso_no_disponible';
  end if;

  if v_aviso.tipo = 'pregunta' then
    if p_opcion not in ('a', 'b') then raise exception 'opcion_invalida'; end if;
    v_opcion := p_opcion;
  else
    v_opcion := null;
  end if;

  insert into public.avisos_respuestas (aviso_id, persona_tipo, persona_id, opcion)
  values (p_aviso_id, p_tipo, v_persona_id, v_opcion)
  on conflict (aviso_id, persona_tipo, persona_id) do nothing;
end;
$function$;

-- Avisos activos para el capitán de la sesión que aún no ha respondido.
create or replace function public.avisos_pendientes_capitan()
returns table(
  id uuid,
  tipo text,
  titulo text,
  cuerpo text,
  opcion_a text,
  opcion_b text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_capitan_id uuid;
  v_asamblea_id uuid;
begin
  select c.id, c.asamblea_id into v_capitan_id, v_asamblea_id
  from public.capitan_actual() c;
  if v_capitan_id is null then raise exception 'not_capitan'; end if;

  return query
    select a.id, a.tipo, a.titulo, a.cuerpo, a.opcion_a, a.opcion_b, a.created_at
    from public.avisos a
    where a.asamblea_id = v_asamblea_id
      and not a.archivado
      and (a.expira_at is null or a.expira_at > now())
      and 'capitan' = any(a.audiencias)
      and not exists (
        select 1 from public.avisos_respuestas r
        where r.aviso_id = a.id
          and r.persona_tipo = 'capitan'
          and r.persona_id = v_capitan_id
      )
    order by a.created_at;
end;
$function$;

-- El capitán marca un aviso como visto (o elige A/B en una pregunta).
create or replace function public.avisos_responder_capitan(
  p_aviso_id uuid,
  p_opcion text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_capitan_id uuid;
  v_asamblea_id uuid;
  v_aviso public.avisos%rowtype;
  v_opcion text;
begin
  select c.id, c.asamblea_id into v_capitan_id, v_asamblea_id
  from public.capitan_actual() c;
  if v_capitan_id is null then raise exception 'not_capitan'; end if;

  select * into v_aviso from public.avisos a where a.id = p_aviso_id;
  if not found
    or v_aviso.asamblea_id <> v_asamblea_id
    or not ('capitan' = any(v_aviso.audiencias)) then
    raise exception 'aviso_no_disponible';
  end if;

  if v_aviso.tipo = 'pregunta' then
    if p_opcion not in ('a', 'b') then raise exception 'opcion_invalida'; end if;
    v_opcion := p_opcion;
  else
    v_opcion := null;
  end if;

  insert into public.avisos_respuestas (aviso_id, persona_tipo, persona_id, opcion)
  values (p_aviso_id, 'capitan', v_capitan_id, v_opcion)
  on conflict (aviso_id, persona_tipo, persona_id) do nothing;
end;
$function$;

-- Publica `avisos` en Realtime: los capitanes (con sesión) reciben el aviso al
-- instante. El personal sin sesión usa sondeo desde su portal.
do $$
begin
  alter publication supabase_realtime add table public.avisos;
exception when duplicate_object then null;
end $$;
