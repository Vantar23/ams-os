-- Superintendentes (subcapitan) y auxiliares deben tener acceso total como el
-- owner. Las páginas /ajustes, /incidencias y /recepción del local ya no los
-- bloquean en la UI; aquí ampliamos las policies de escritura para que también
-- puedan crear/actualizar/eliminar en la base de datos.
--
-- Nota: /ajustes edita `public.asambleas`, cuya policy de UPDATE ya permite a
-- cualquier miembro (is_asamblea_miembro), así que no requiere cambios.

-- Incidencias --------------------------------------------------------------

drop policy if exists "owner_capitan_insert_incidencias" on public.incidencias;
create policy "owner_capitan_insert_incidencias"
  on public.incidencias for insert
  with check (
    exists (
      select 1 from public.asamblea_miembros m
      where m.asamblea_id = incidencias.asamblea_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'capitan', 'subcapitan', 'auxiliar')
    )
  );

drop policy if exists "owner_capitan_update_incidencias" on public.incidencias;
create policy "owner_capitan_update_incidencias"
  on public.incidencias for update
  using (
    exists (
      select 1 from public.asamblea_miembros m
      where m.asamblea_id = incidencias.asamblea_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'capitan', 'subcapitan', 'auxiliar')
    )
  );

drop policy if exists "owner_capitan_delete_incidencias" on public.incidencias;
create policy "owner_capitan_delete_incidencias"
  on public.incidencias for delete
  using (
    exists (
      select 1 from public.asamblea_miembros m
      where m.asamblea_id = incidencias.asamblea_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'capitan', 'subcapitan', 'auxiliar')
    )
  );

-- Recepción del local ------------------------------------------------------

drop policy if exists "owner_capitan_insert_recepcion" on public.recepcion_local_items;
create policy "owner_capitan_insert_recepcion"
  on public.recepcion_local_items for insert
  with check (
    exists (
      select 1 from public.asamblea_miembros m
      where m.asamblea_id = recepcion_local_items.asamblea_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'capitan', 'subcapitan', 'auxiliar')
    )
  );

drop policy if exists "owner_capitan_update_recepcion" on public.recepcion_local_items;
create policy "owner_capitan_update_recepcion"
  on public.recepcion_local_items for update
  using (
    exists (
      select 1 from public.asamblea_miembros m
      where m.asamblea_id = recepcion_local_items.asamblea_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'capitan', 'subcapitan', 'auxiliar')
    )
  );

drop policy if exists "owner_capitan_delete_recepcion" on public.recepcion_local_items;
create policy "owner_capitan_delete_recepcion"
  on public.recepcion_local_items for delete
  using (
    exists (
      select 1 from public.asamblea_miembros m
      where m.asamblea_id = recepcion_local_items.asamblea_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'capitan', 'subcapitan', 'auxiliar')
    )
  );
