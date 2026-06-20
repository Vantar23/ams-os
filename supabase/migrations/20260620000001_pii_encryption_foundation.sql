-- =============================================================================
-- PII encryption foundation (telefono, nombre, apellido)
-- =============================================================================
-- Cifrado de datos personales a nivel de columna dentro de Postgres usando
-- pgcrypto (pgp_sym_encrypt) con la llave maestra guardada en Supabase Vault.
--
-- Esta migración SOLO instala la infraestructura reutilizable:
--   * extensión pgcrypto
--   * un secreto en Vault con la llave AES de los datos personales
--   * helpers private.encrypt_pii / private.decrypt_pii
--
-- La conversión de cada tabla (capitanes, acomodadores, hermanas_apoyo, ...)
-- a columnas cifradas + vistas que descifran + triggers de escritura se hace
-- en migraciones posteriores, una vez exportado el esquema real desde el
-- proyecto en vivo. Ver docs/pii-encryption-plan.md.
--
-- NOTA: requiere Supabase Vault (disponible por defecto en proyectos Supabase)
-- y la extensión pgcrypto. No probado contra la instancia en vivo: revisar
-- antes de aplicar con `supabase db push`.
-- =============================================================================

-- 1. pgcrypto (convención Supabase: en el esquema `extensions`).
create extension if not exists pgcrypto with schema extensions;

-- 2. Esquema privado, NO expuesto por PostgREST (Supabase publica solo `public`).
create schema if not exists private;
revoke all on schema private from anon, authenticated;

-- 3. Llave maestra en Vault. Se genera una sola vez, de forma idempotente.
--    El valor real queda cifrado por la llave raíz que gestiona Supabase.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'pii_encryption_key') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'pii_encryption_key',
      'Llave AES para cifrar datos personales (telefono, nombre, apellido)'
    );
  end if;
end
$$;

-- 4. Lectura de la llave. security definer para que las funciones que cifran/
--    descifran (también security definer) puedan resolverla sin exponerla.
create or replace function private.pii_key()
returns text
language sql
stable
security definer
set search_path = vault, public
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'pii_encryption_key'
  limit 1;
$$;

-- 5. Helpers de cifrado/descifrado. Null-safe: null -> null.
create or replace function private.encrypt_pii(p_plaintext text)
returns bytea
language sql
stable
security definer
set search_path = extensions, private
as $$
  select case
    when p_plaintext is null then null
    else extensions.pgp_sym_encrypt(p_plaintext, private.pii_key())
  end;
$$;

create or replace function private.decrypt_pii(p_ciphertext bytea)
returns text
language sql
stable
security definer
set search_path = extensions, private
as $$
  select case
    when p_ciphertext is null then null
    else extensions.pgp_sym_decrypt(p_ciphertext, private.pii_key())
  end;
$$;

-- 6. Estas funciones solo deben invocarse desde otras funciones/vistas
--    security definer del backend, nunca directamente por el cliente.
revoke all on function private.pii_key() from public, anon, authenticated;
revoke all on function private.encrypt_pii(text) from public, anon, authenticated;
revoke all on function private.decrypt_pii(bytea) from public, anon, authenticated;
