-- Datos de contacto opcionales para saber de quién es cada pase de acceso.
-- El teléfono permite enviar el enlace por WhatsApp directo a esa persona.
alter table public.accesos_pases
  add column if not exists nombre text,
  add column if not exists telefono text;
