-- Contador de respuestas del admin sin leer para el globito del menú en
-- los portales de acomodador y hermana de apoyo.

create or replace function public.mensajes_no_leidos_personal(
  p_tipo text,
  p_access_token text,
  p_device_key_hash text
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_persona_id uuid;
  v_asamblea_id uuid;
  v_n integer;
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
  if v_persona_id is null then return 0; end if;

  select count(*) into v_n
  from public.mensajes m
  where m.asamblea_id = v_asamblea_id
    and m.persona_tipo = p_tipo
    and m.persona_id = v_persona_id
    and m.remitente = 'admin'
    and m.leido = false;
  return v_n;
end;
$function$;
