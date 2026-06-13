-- Recordatorio de turno: un push 20 min antes del inicio del programa a quienes
-- ya tienen puesto asignado en la sesión vigente (acomodadores y hermanas).
--
-- Las horas de inicio (mañana/tarde) son configurables por asamblea; la fecha
-- de cada día se deriva del rango "fechas". Un job de pg_cron por minuto llama
-- a /api/cron/recordatorios, que calcula la ventana y envía los push reutilizando
-- lib/push/server.ts. La tabla recordatorios_turno evita repetir el aviso.

alter table public.asambleas
  add column if not exists hora_inicio_manana time,
  add column if not exists hora_inicio_tarde time;

create table if not exists public.recordatorios_turno (
  id uuid primary key default gen_random_uuid(),
  asamblea_id uuid not null references public.asambleas(id) on delete cascade,
  slot text not null check (slot in (
    'viernes-manana', 'viernes-tarde',
    'sabado-manana', 'sabado-tarde',
    'domingo-manana', 'domingo-tarde'
  )),
  fecha date not null,
  created_at timestamptz not null default now(),
  unique (asamblea_id, slot, fecha)
);

alter table public.recordatorios_turno enable row level security;

-- El envío corre con service role (ignora RLS). Esta política solo deja que un
-- miembro consulte qué recordatorios ya se enviaron.
drop policy if exists "recordatorios_turno_member_select" on public.recordatorios_turno;
create policy "recordatorios_turno_member_select"
  on public.recordatorios_turno for select
  using (public.is_asamblea_miembro(asamblea_id));
