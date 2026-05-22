-- Permite que el dueño del enlace re-vincule su acceso a un dispositivo nuevo
-- sin tener que pedirle al capitán que regenere el token. Equivale a
-- "liberar la sesión anterior y abrirla aquí". El access_token sigue siendo
-- el secreto: quien lo tenga puede tomar control.
--
-- Asume que las columnas se llaman `device_key_hash` en `acomodadores` y
-- `hermanas_apoyo` (mismo nombre que el parámetro de `acceso_claim`). Si en
-- tu esquema la columna se llama distinto, ajusta los UPDATE.

create or replace function public.acceso_rebind(
  p_access_token text,
  p_device_key_hash text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if coalesce(p_access_token, '') = '' then
    raise exception 'invalid_access_token';
  end if;
  if coalesce(p_device_key_hash, '') = '' then
    raise exception 'missing_device_key_hash';
  end if;

  update public.acomodadores
    set device_key_hash = p_device_key_hash
    where access_token = p_access_token;
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'invalid_access_token';
  end if;
end;
$$;

revoke all on function public.acceso_rebind(text, text) from public;
grant execute on function public.acceso_rebind(text, text) to anon, authenticated;

create or replace function public.hermana_acceso_rebind(
  p_access_token text,
  p_device_key_hash text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if coalesce(p_access_token, '') = '' then
    raise exception 'invalid_access_token';
  end if;
  if coalesce(p_device_key_hash, '') = '' then
    raise exception 'missing_device_key_hash';
  end if;

  update public.hermanas_apoyo
    set device_key_hash = p_device_key_hash
    where access_token = p_access_token;
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'invalid_access_token';
  end if;
end;
$$;

revoke all on function public.hermana_acceso_rebind(text, text) from public;
grant execute on function public.hermana_acceso_rebind(text, text) to anon, authenticated;
