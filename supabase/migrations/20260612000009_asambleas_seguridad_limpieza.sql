-- Teléfonos de contacto adicionales de la asamblea, junto al de primeros
-- auxilios: seguridad y limpieza (10 dígitos, sin código de país).

alter table public.asambleas
  add column if not exists seguridad_telefono text,
  add column if not exists limpieza_telefono text;
