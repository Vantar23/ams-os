-- Enlace público por incidencia: el botón de WhatsApp manda un link a una
-- página que muestra SOLO ese reporte (con su foto). El token es un uuid
-- imposible de adivinar; quien tenga el enlace ve únicamente esa incidencia.

alter table public.incidencias
  add column if not exists share_token uuid not null default gen_random_uuid();

create unique index if not exists incidencias_share_token_idx
  on public.incidencias (share_token);
