-- Publica public.asignaciones en Realtime para que el panel administrador
-- reciba en tiempo real cuando un capitán marca un puesto como
-- 'necesita_remplazo' (UPDATE de asignaciones.asistencia), igual que ya ocurre
-- con incidencias y mensajes. El payload nuevo (new) basta con la replica
-- identity por defecto (llave primaria); no se necesita REPLICA IDENTITY FULL.
do $$
begin
  alter publication supabase_realtime add table public.asignaciones;
exception when duplicate_object then null;
end $$;
