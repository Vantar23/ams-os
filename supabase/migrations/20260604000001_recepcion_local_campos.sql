-- Recepción del local: renombra "categoria" a "desperfecto" y agrega campos
-- de ubicación (nivel = piso, zona = área), número de butaca y otro objeto.
-- Todos los campos nuevos son opcionales; solo el desperfecto y la foto son
-- obligatorios al reportar.

alter table public.recepcion_local_items
  rename column categoria to desperfecto;

alter table public.recepcion_local_items
  add column if not exists nivel text,
  add column if not exists zona text,
  add column if not exists butaca text,
  add column if not exists otro_objeto text;
