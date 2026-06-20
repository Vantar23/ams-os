-- =============================================================================
-- Bitácora de consentimientos (LFPDPPP)
-- =============================================================================
-- Tabla-ledger que persiste la evidencia de:
--   * consentimiento del titular al registrarse ('registro')
--   * autorización de quien captura datos de un tercero ('autorizacion_tercero')
--   * aceptación del aviso en el primer acceso al portal ('aviso_primer_acceso')
--
-- Es independiente del esquema existente: solo el backend (service role) la
-- escribe/lee, desde los server actions. No toca las tablas ni los RPC que
-- viven en el proyecto en vivo.
--
-- NOTA: titular_nombre/titular_telefono se guardan como evidencia de a quién
-- pertenece el consentimiento. Cuando se aplique el cifrado de PII
-- (docs/pii-encryption-plan.md), estas columnas deben cifrarse también.
-- =============================================================================

create table if not exists public.consentimientos (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  tipo text not null check (
    tipo in ('registro', 'autorizacion_tercero', 'aviso_primer_acceso')
  ),
  rol text,
  asamblea_id uuid,
  -- A quién pertenecen los datos (el titular).
  titular_nombre text,
  titular_telefono text,
  -- Quién otorgó: null = el propio titular; si no, el usuario que capturó.
  otorgante_user_id uuid,
  -- Referencia opcional (p. ej. token de registro) para trazabilidad.
  referencia text,
  -- Versión del aviso de privacidad aceptada.
  version_aviso text not null,
  user_agent text,
  ip text
);

comment on table public.consentimientos is
  'Bitácora de consentimientos de privacidad y autorizaciones de terceros (LFPDPPP).';

create index if not exists consentimientos_asamblea_idx
  on public.consentimientos (asamblea_id);
create index if not exists consentimientos_telefono_idx
  on public.consentimientos (titular_telefono);

-- RLS activo sin políticas: anon/authenticated no acceden vía PostgREST.
-- El backend usa la service role, que omite RLS.
alter table public.consentimientos enable row level security;
