-- Link público de asistencia en tiempo real: cada asamblea tiene un token
-- estable e irrepetible que va en la URL pública (/asistencia/en-vivo/<token>).
-- La página pública lee con service role (igual que las incidencias
-- compartidas), así que no se exponen policies a anon.
alter table public.asambleas
  add column if not exists asistencia_share_token uuid not null default gen_random_uuid();

create unique index if not exists asambleas_asistencia_share_token_idx
  on public.asambleas (asistencia_share_token);
