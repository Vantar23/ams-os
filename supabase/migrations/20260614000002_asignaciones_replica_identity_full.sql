-- El panel de puestos se suscribe a Realtime con un filtro por columna que NO es
-- la llave primaria: `filter: asamblea_id=eq.<id>` (ver puestos-client.tsx). Con
-- la replica identity por defecto (solo la llave primaria `id`), el payload de un
-- DELETE únicamente trae la llave primaria en el registro `old`, así que
-- `asamblea_id` viene vacío y el filtro nunca coincide: el evento DELETE se
-- descarta en silencio. Por eso el panel se actualizaba en vivo al AGREGAR un
-- puesto (INSERT/UPDATE traen todas las columnas en `new`) pero no al RETIRARLO.
--
-- REPLICA IDENTITY FULL hace que el registro `old` de los DELETE incluya todas
-- las columnas (incluida `asamblea_id`), de modo que el filtro coincide y el
-- evento llega a los suscriptores.
alter table public.asignaciones replica identity full;
alter table public.asignaciones_hermanas replica identity full;
