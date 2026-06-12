-- Teléfono de primeros auxilios de la asamblea, editable desde Ajustes.
alter table public.asambleas
  add column if not exists primeros_auxilios_telefono text;
