-- Publica public.asignaciones_hermanas en Realtime para que el panel de puestos
-- reciba en vivo las asignaciones de hermanas de apoyo, igual que ya ocurre con
-- public.asignaciones. Así dos personas pueden asignar a la vez y cada una ve
-- los cambios de la otra sin recargar. La replica identity por defecto (llave
-- primaria) basta; no se necesita REPLICA IDENTITY FULL.
do $$
begin
  alter publication supabase_realtime add table public.asignaciones_hermanas;
exception when duplicate_object then null;
end $$;
