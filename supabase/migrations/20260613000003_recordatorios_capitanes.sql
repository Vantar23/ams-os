-- Aviso "pasa lista" a los capitanes al inicio de cada turno. Comparte la tabla
-- de control con el recordatorio de acomodadores (que se envía 20 min antes),
-- así que distinguimos por `tipo` para que ambos avisos puedan registrarse el
-- mismo día y turno sin chocar.

alter table public.recordatorios_turno
  add column if not exists tipo text not null default 'acomodadores';

alter table public.recordatorios_turno
  drop constraint if exists recordatorios_turno_asamblea_id_slot_fecha_key;

create unique index if not exists recordatorios_turno_unq
  on public.recordatorios_turno (asamblea_id, slot, fecha, tipo);
