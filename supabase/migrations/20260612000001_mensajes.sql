-- Mensajería entre el personal (acomodadores / hermanas de apoyo) y el
-- equipo administrador, en tiempo real. El personal escribe desde su portal
-- (validado por access_token + dispositivo vía RPC security definer); los
-- administradores leen y contestan con su sesión normal (RLS de miembros).
-- También publica `mensajes` e `incidencias` en Realtime para notificar al
-- panel sin recargar.

create table if not exists public.mensajes (
  id uuid primary key default gen_random_uuid(),
  asamblea_id uuid not null references public.asambleas(id) on delete cascade,
  persona_tipo text not null check (persona_tipo in ('acomodador', 'hermana')),
  persona_id uuid not null,
  remitente text not null check (remitente in ('persona', 'admin')),
  admin_user_id uuid references auth.users(id) on delete set null,
  cuerpo text not null check (char_length(cuerpo) between 1 and 2000),
  -- Leído por el destinatario (admin cuando remitente = 'persona' y
  -- viceversa).
  leido boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists mensajes_thread_idx
  on public.mensajes (asamblea_id, persona_tipo, persona_id, created_at);

alter table public.mensajes enable row level security;

drop policy if exists mensajes_member_select on public.mensajes;
create policy mensajes_member_select
  on public.mensajes for select
  using (is_asamblea_miembro(asamblea_id));

drop policy if exists mensajes_member_insert on public.mensajes;
create policy mensajes_member_insert
  on public.mensajes for insert
  with check (
    is_asamblea_miembro(asamblea_id)
    and remitente = 'admin'
    and admin_user_id = auth.uid()
  );

drop policy if exists mensajes_member_update on public.mensajes;
create policy mensajes_member_update
  on public.mensajes for update
  using (is_asamblea_miembro(asamblea_id));

-- El personal envía mensajes desde su portal.
create or replace function public.mensajes_enviar_personal(
  p_tipo text,
  p_access_token text,
  p_device_key_hash text,
  p_cuerpo text
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_persona_id uuid;
  v_asamblea_id uuid;
  v_id uuid;
begin
  if coalesce(trim(p_cuerpo), '') = '' or char_length(p_cuerpo) > 2000 then
    raise exception 'invalid_cuerpo';
  end if;

  if p_tipo = 'acomodador' then
    select a.id, a.asamblea_id into v_persona_id, v_asamblea_id
    from public.acomodadores a
    where a.access_token = p_access_token
      and a.device_bound_at is not null
      and a.device_key_hash = p_device_key_hash;
  elsif p_tipo = 'hermana' then
    select h.id, h.asamblea_id into v_persona_id, v_asamblea_id
    from public.hermanas_apoyo h
    where h.access_token = p_access_token
      and h.device_bound_at is not null
      and h.device_key_hash = p_device_key_hash;
  else
    raise exception 'invalid_tipo';
  end if;
  if v_persona_id is null then raise exception 'invalid_access_token'; end if;

  insert into public.mensajes
    (asamblea_id, persona_tipo, persona_id, remitente, cuerpo)
  values
    (v_asamblea_id, p_tipo, v_persona_id, 'persona', trim(p_cuerpo))
  returning id into v_id;
  return v_id;
end;
$function$;

-- El personal lista su conversación; de paso marca como leídas las
-- respuestas del admin.
create or replace function public.mensajes_listar_personal(
  p_tipo text,
  p_access_token text,
  p_device_key_hash text
)
returns table(
  id uuid,
  remitente text,
  cuerpo text,
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
  if p_tipo = 'acomodador' then
    select a.id, a.asamblea_id into v_persona_id, v_asamblea_id
    from public.acomodadores a
    where a.access_token = p_access_token
      and a.device_bound_at is not null
      and a.device_key_hash = p_device_key_hash;
  elsif p_tipo = 'hermana' then
    select h.id, h.asamblea_id into v_persona_id, v_asamblea_id
    from public.hermanas_apoyo h
    where h.access_token = p_access_token
      and h.device_bound_at is not null
      and h.device_key_hash = p_device_key_hash;
  else
    raise exception 'invalid_tipo';
  end if;
  if v_persona_id is null then raise exception 'invalid_access_token'; end if;

  update public.mensajes m
    set leido = true
  where m.asamblea_id = v_asamblea_id
    and m.persona_tipo = p_tipo
    and m.persona_id = v_persona_id
    and m.remitente = 'admin'
    and m.leido = false;

  return query
    select m.id, m.remitente, m.cuerpo, m.created_at
    from public.mensajes m
    where m.asamblea_id = v_asamblea_id
      and m.persona_tipo = p_tipo
      and m.persona_id = v_persona_id
    order by m.created_at;
end;
$function$;

-- Publica las tablas en Realtime para el panel administrador.
do $$
begin
  alter publication supabase_realtime add table public.mensajes;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.incidencias;
exception when duplicate_object then null;
end $$;
