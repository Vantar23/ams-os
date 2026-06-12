-- Los capitanes también chatean con administración, desde su nuevo menú
-- simple (/capitan). A diferencia del personal con enlace, su identidad sale
-- de la sesión (capitanes.user_id = auth.uid()), así que estos RPC validan
-- eso en lugar de access_token + dispositivo.

alter table public.mensajes drop constraint mensajes_persona_tipo_check;
alter table public.mensajes add constraint mensajes_persona_tipo_check
  check (persona_tipo in ('acomodador', 'hermana', 'capitan'));

-- Resuelve el capitán de la sesión actual (el de la asamblea más reciente).
create or replace function public.capitan_actual()
returns table(id uuid, asamblea_id uuid)
language sql
security definer
set search_path to 'public'
as $function$
  select c.id, c.asamblea_id
  from public.capitanes c
  where c.user_id = auth.uid()
  order by c.created_at desc
  limit 1;
$function$;

create or replace function public.mensajes_enviar_capitan(p_cuerpo text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_capitan_id uuid;
  v_asamblea_id uuid;
  v_id uuid;
begin
  if coalesce(trim(p_cuerpo), '') = '' or char_length(p_cuerpo) > 2000 then
    raise exception 'invalid_cuerpo';
  end if;

  select id, asamblea_id into v_capitan_id, v_asamblea_id
  from public.capitan_actual();
  if v_capitan_id is null then raise exception 'not_capitan'; end if;

  insert into public.mensajes
    (asamblea_id, persona_tipo, persona_id, remitente, cuerpo)
  values
    (v_asamblea_id, 'capitan', v_capitan_id, 'persona', trim(p_cuerpo))
  returning id into v_id;
  return v_id;
end;
$function$;

-- Lista la conversación del capitán; de paso marca como leídas las
-- respuestas del admin.
create or replace function public.mensajes_listar_capitan()
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
  v_capitan_id uuid;
  v_asamblea_id uuid;
begin
  select c.id, c.asamblea_id into v_capitan_id, v_asamblea_id
  from public.capitan_actual() c;
  if v_capitan_id is null then raise exception 'not_capitan'; end if;

  update public.mensajes m
    set leido = true
  where m.asamblea_id = v_asamblea_id
    and m.persona_tipo = 'capitan'
    and m.persona_id = v_capitan_id
    and m.remitente = 'admin'
    and m.leido = false;

  return query
    select m.id, m.remitente, m.cuerpo, m.created_at
    from public.mensajes m
    where m.asamblea_id = v_asamblea_id
      and m.persona_tipo = 'capitan'
      and m.persona_id = v_capitan_id
    order by m.created_at;
end;
$function$;

-- Respuestas del admin que el capitán aún no ha leído (para el badge del
-- menú).
create or replace function public.mensajes_no_leidos_capitan()
returns integer
language sql
security definer
set search_path to 'public'
as $function$
  select count(*)::integer
  from public.mensajes m
  join public.capitan_actual() c
    on c.id = m.persona_id and c.asamblea_id = m.asamblea_id
  where m.persona_tipo = 'capitan'
    and m.remitente = 'admin'
    and m.leido = false;
$function$;
