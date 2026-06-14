-- Módulo "Accesos": pases de acceso a áreas restringidas (palcos, áreas de
-- departamentos, zonas restringidas, etc.). No son las "áreas" de /areas (salas
-- del recinto), sino zonas con control de acceso que el admin define libremente.
--
-- Cada pase tiene un access_token único e irrepetible (va en la URL) y se liga
-- al PRIMER dispositivo que lo confirma. A diferencia de los acomodadores, un
-- pase NUNCA se re-liga: una vez confirmado en un dispositivo, no abre en otro.
-- El admin puede eliminar un pase para revocar el acceso.

create table if not exists public.accesos_areas (
  id uuid primary key default gen_random_uuid(),
  asamblea_id uuid not null references public.asambleas(id) on delete cascade,
  nombre text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.accesos_pases (
  id uuid primary key default gen_random_uuid(),
  asamblea_id uuid not null references public.asambleas(id) on delete cascade,
  area_id uuid not null references public.accesos_areas(id) on delete cascade,
  access_token text not null unique,
  -- null hasta que un dispositivo lo reclama; luego queda fijo para siempre.
  device_key_hash text,
  device_bound_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists accesos_areas_asamblea_idx
  on public.accesos_areas (asamblea_id);
create index if not exists accesos_pases_area_idx
  on public.accesos_pases (area_id);
create index if not exists accesos_pases_asamblea_idx
  on public.accesos_pases (asamblea_id);

alter table public.accesos_areas enable row level security;
alter table public.accesos_pases enable row level security;

-- Solo los miembros de la asamblea (admin) gestionan áreas y pases. El portal
-- público del pase no usa estas policies: entra por RPC security definer.
drop policy if exists accesos_areas_miembros on public.accesos_areas;
create policy accesos_areas_miembros on public.accesos_areas
  for all
  using (public.is_asamblea_miembro(asamblea_id))
  with check (public.is_asamblea_miembro(asamblea_id));

drop policy if exists accesos_pases_miembros on public.accesos_pases;
create policy accesos_pases_miembros on public.accesos_pases
  for all
  using (public.is_asamblea_miembro(asamblea_id))
  with check (public.is_asamblea_miembro(asamblea_id));

-- Abre un pase por su token, validando el dispositivo. Mismo contrato que
-- acceso_open (acomodadores): is_unbound = true cuando aún no lo reclama nadie.
create or replace function public.acceso_pase_open(
  p_access_token text,
  p_device_key_hash text
) returns table(
  id uuid,
  area_nombre text,
  asamblea_numero text,
  asamblea_edicion text,
  asamblea_titulo text,
  asamblea_fechas text,
  asamblea_sede text,
  is_unbound boolean,
  created_at timestamptz,
  device_bound_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.accesos_pases;
  v_area public.accesos_areas;
  v_a public.asambleas;
begin
  select * into v from public.accesos_pases p where p.access_token = p_access_token;
  if not found then
    raise exception 'invalid_access_token';
  end if;

  if v.device_bound_at is not null and v.device_key_hash <> p_device_key_hash then
    raise exception 'device_mismatch';
  end if;

  select * into v_area from public.accesos_areas a where a.id = v.area_id;
  select * into v_a from public.asambleas a where a.id = v.asamblea_id;

  return query
    select v.id, v_area.nombre,
           v_a.numero, v_a.edicion, v_a.titulo, v_a.fechas, v_a.sede,
           (v.device_bound_at is null) as is_unbound,
           v.created_at, v.device_bound_at;
end;
$$;

-- Liga el pase al dispositivo actual, pero SOLO si todavía no está ligado a
-- ninguno (el primer dispositivo gana, de forma atómica). Nunca re-liga.
create or replace function public.acceso_pase_claim(
  p_access_token text,
  p_device_key_hash text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if coalesce(p_access_token, '') = '' then
    raise exception 'invalid_access_token';
  end if;
  if coalesce(p_device_key_hash, '') = '' then
    raise exception 'missing_device_key_hash';
  end if;

  update public.accesos_pases
    set device_key_hash = p_device_key_hash, device_bound_at = now()
    where access_token = p_access_token and device_bound_at is null;
  get diagnostics v_count = row_count;

  if v_count = 0 then
    -- O el pase no existe, o ya está ligado a otro dispositivo: nunca se re-liga.
    if exists (select 1 from public.accesos_pases where access_token = p_access_token) then
      raise exception 'device_mismatch';
    else
      raise exception 'invalid_access_token';
    end if;
  end if;
end;
$$;

revoke all on function public.acceso_pase_open(text, text) from public;
grant execute on function public.acceso_pase_open(text, text) to anon, authenticated;
revoke all on function public.acceso_pase_claim(text, text) from public;
grant execute on function public.acceso_pase_claim(text, text) to anon, authenticated;
