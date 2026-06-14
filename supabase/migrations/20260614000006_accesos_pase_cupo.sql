-- Pases de acceso con CUPO de varios dispositivos.
--
-- Antes cada pase se ligaba a UN solo dispositivo (el primero que lo confirmaba)
-- y nunca abría en otro. Ahora un mismo enlace puede admitir N dispositivos
-- (para familiares o invitados): cada dispositivo que lo abre ocupa un lugar
-- hasta llenar el cupo. Una vez lleno, ningún dispositivo nuevo puede entrar
-- y el enlace no se reutiliza; los ya ligados siguen funcionando.

-- Número de dispositivos que admite el enlace. 1 = comportamiento anterior.
alter table public.accesos_pases
  add column if not exists cupo int not null default 1;

alter table public.accesos_pases
  drop constraint if exists accesos_pases_cupo_check;
alter table public.accesos_pases
  add constraint accesos_pases_cupo_check check (cupo >= 1 and cupo <= 50);

-- Un registro por dispositivo ligado a un pase (hasta `cupo`).
create table if not exists public.accesos_pases_dispositivos (
  id uuid primary key default gen_random_uuid(),
  pase_id uuid not null references public.accesos_pases(id) on delete cascade,
  device_key_hash text not null,
  bound_at timestamptz not null default now(),
  unique (pase_id, device_key_hash)
);

create index if not exists accesos_pases_disp_pase_idx
  on public.accesos_pases_dispositivos (pase_id);

alter table public.accesos_pases_dispositivos enable row level security;

-- Los miembros de la asamblea (admin) pueden ver/gestionar los dispositivos de
-- sus pases. El portal público entra por RPC security definer, no por policy.
drop policy if exists accesos_pases_disp_miembros on public.accesos_pases_dispositivos;
create policy accesos_pases_disp_miembros on public.accesos_pases_dispositivos
  for all
  using (
    exists (
      select 1 from public.accesos_pases p
      where p.id = pase_id and public.is_asamblea_miembro(p.asamblea_id)
    )
  )
  with check (
    exists (
      select 1 from public.accesos_pases p
      where p.id = pase_id and public.is_asamblea_miembro(p.asamblea_id)
    )
  );

-- Migra los dispositivos ya ligados (modelo de un solo dispositivo) a la tabla
-- hija, para no perder los accesos existentes.
insert into public.accesos_pases_dispositivos (pase_id, device_key_hash, bound_at)
select id, device_key_hash, coalesce(device_bound_at, now())
from public.accesos_pases
where device_key_hash is not null
on conflict (pase_id, device_key_hash) do nothing;

-- Abre un pase por su token. Ya no falla por "device_mismatch": devuelve flags
-- para que la app decida. is_bound = este dispositivo ya ocupa un lugar;
-- is_full = no quedan lugares y este dispositivo no está ligado.
drop function if exists public.acceso_pase_open(text, text);

create or replace function public.acceso_pase_open(
  p_access_token text,
  p_device_key_hash text
) returns table(
  id uuid,
  area_nombre text,
  nombre text,
  asamblea_numero text,
  asamblea_edicion text,
  asamblea_titulo text,
  asamblea_fechas text,
  asamblea_sede text,
  cupo int,
  usados int,
  is_bound boolean,
  is_full boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.accesos_pases;
  v_area public.accesos_areas;
  v_a public.asambleas;
  v_usados int;
  v_bound boolean;
begin
  select * into v from public.accesos_pases p where p.access_token = p_access_token;
  if not found then
    raise exception 'invalid_access_token';
  end if;

  select count(*) into v_usados
    from public.accesos_pases_dispositivos d where d.pase_id = v.id;
  select exists (
    select 1 from public.accesos_pases_dispositivos d
    where d.pase_id = v.id and d.device_key_hash = p_device_key_hash
  ) into v_bound;

  select * into v_area from public.accesos_areas a where a.id = v.area_id;
  select * into v_a from public.asambleas a where a.id = v.asamblea_id;

  return query
    select v.id, v_area.nombre, v.nombre,
           v_a.numero, v_a.edicion, v_a.titulo, v_a.fechas, v_a.sede,
           v.cupo, v_usados, v_bound,
           (not v_bound and v_usados >= v.cupo) as is_full,
           v.created_at;
end;
$$;

-- Liga el dispositivo actual al pase ocupando un lugar, si todavía quedan. Es
-- idempotente (si ya estaba ligado, no hace nada y no falla). Bloquea la fila
-- del pase para serializar reclamos concurrentes del mismo enlace.
create or replace function public.acceso_pase_claim(
  p_access_token text,
  p_device_key_hash text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.accesos_pases;
  v_usados int;
begin
  if coalesce(p_access_token, '') = '' then
    raise exception 'invalid_access_token';
  end if;
  if coalesce(p_device_key_hash, '') = '' then
    raise exception 'missing_device_key_hash';
  end if;

  select * into v from public.accesos_pases p
    where p.access_token = p_access_token
    for update;
  if not found then
    raise exception 'invalid_access_token';
  end if;

  -- Ya tiene lugar en este dispositivo: éxito idempotente.
  if exists (
    select 1 from public.accesos_pases_dispositivos d
    where d.pase_id = v.id and d.device_key_hash = p_device_key_hash
  ) then
    return;
  end if;

  select count(*) into v_usados
    from public.accesos_pases_dispositivos d where d.pase_id = v.id;
  if v_usados >= v.cupo then
    raise exception 'limit_reached';
  end if;

  insert into public.accesos_pases_dispositivos (pase_id, device_key_hash)
    values (v.id, p_device_key_hash);
end;
$$;

revoke all on function public.acceso_pase_open(text, text) from public;
grant execute on function public.acceso_pase_open(text, text) to anon, authenticated;
revoke all on function public.acceso_pase_claim(text, text) from public;
grant execute on function public.acceso_pase_claim(text, text) to anon, authenticated;
