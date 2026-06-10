-- Web Push: llaves VAPID (generadas una vez por el servidor) y
-- suscripciones por dispositivo. Solo el service role toca estas tablas;
-- RLS queda activado sin políticas.

create table if not exists public.webpush_config (
  id int primary key default 1 check (id = 1),
  public_key text not null,
  private_key text not null,
  created_at timestamptz not null default now()
);

alter table public.webpush_config enable row level security;

create table if not exists public.push_suscripciones (
  id uuid primary key default gen_random_uuid(),
  asamblea_id uuid not null references public.asambleas(id) on delete cascade,
  -- 'admin' (miembro del panel) o el tipo de personal del portal.
  destinatario text not null check (destinatario in ('admin', 'acomodador', 'hermana')),
  user_id uuid references auth.users(id) on delete cascade,
  persona_id uuid,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_suscripciones_destino_idx
  on public.push_suscripciones (asamblea_id, destinatario, persona_id);

alter table public.push_suscripciones enable row level security;
