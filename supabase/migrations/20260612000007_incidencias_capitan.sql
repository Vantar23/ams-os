-- Los capitanes también reportan incidencias desde su menú simple
-- (/capitan/incidencias). Igual que con acomodadores y hermanas, guardamos
-- quién reportó para mostrarlo en la lista de administración.

alter table public.incidencias
  add column if not exists reportado_por_capitan_id uuid
    references public.capitanes(id) on delete set null;
