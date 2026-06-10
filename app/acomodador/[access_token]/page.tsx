import Link from "next/link"
import {
  AlertOctagonIcon,
  BookOpenIcon,
  CalendarCheckIcon,
  ClipboardCheckIcon,
  MapIcon,
  MapPinIcon,
} from "lucide-react"

import { CapitanCard } from "@/components/capitan-card"
import { RememberPersonal } from "@/components/remember-personal"
import {
  momentoEnRecinto,
  slotLabelCorto,
  slotsVisibles,
} from "@/lib/disponibilidad"
import { createAdminClient } from "@/lib/supabase/admin"

import { BlockedView } from "./blocked-view"
import { ClaimView } from "./claim-view"
import { loadAcomodadorByToken, loadAsignaciones } from "./load"

export default async function Page({
  params,
}: {
  params: Promise<{ access_token: string }>
}) {
  const { access_token } = await params
  const result = await loadAcomodadorByToken(access_token)

  if (result.kind === "blocked") {
    return <BlockedView reason={result.reason} message={result.message} accessToken={access_token} />
  }
  if (result.kind === "claim") {
    return (
      <ClaimView
        accessToken={access_token}
        nombre={result.nombre}
        asamblea={result.asamblea}
      />
    )
  }

  const { acomodador } = result
  const capitan = await loadCapitanAsignado(acomodador.id)
  const asignaciones = await loadAsignaciones(access_token)
  const visibles = slotsVisibles(
    asignaciones.map((a) => a.slot),
    momentoEnRecinto(),
  )
  const puestos = asignaciones.filter((a) => visibles.includes(a.slot))

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:py-14">
      <RememberPersonal
        tipo="acomodador"
        id={acomodador.id}
        asambleaId={acomodador.asamblea_id}
        nombre={acomodador.nombre}
        apellido={acomodador.apellido}
      />
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:text-xs sm:tracking-[0.25em]">
        Asamblea N° {acomodador.asamblea_numero} —{" "}
        {acomodador.asamblea_edicion}
      </p>
      <h1 className="mt-3 font-serif text-[2rem] leading-[1.1] text-foreground sm:text-4xl sm:leading-tight">
        Hola, {acomodador.nombre} {acomodador.apellido}
      </h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <p className="inline-flex w-fit items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary">
          Estás asignado como acomodador
        </p>
        {puestos.map((a) => (
          <span
            key={a.asignacion_id}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs text-foreground"
          >
            <MapPinIcon className="size-3.5 text-muted-foreground" />
            {a.area_nombre} · {slotLabelCorto(a.slot)}
          </span>
        ))}
      </div>

      {capitan && (
        <CapitanCard
          nombre={capitan.nombre}
          apellido={capitan.apellido}
          telefono={capitan.telefono}
        />
      )}

      <nav className="mt-10 grid gap-3">
        <NavCard
          href={`/acomodador/${access_token}/asistencia`}
          icon={<CalendarCheckIcon className="size-5" />}
          title="Asistencia"
          description="Confirma las sesiones a las que vas a asistir."
        />
        <NavCard
          href={`/acomodador/${access_token}/incidencias`}
          icon={<AlertOctagonIcon className="size-5" />}
          title="Incidencias"
          description="Reporta una incidencia durante la asamblea."
        />
        <NavCard
          href={`/acomodador/${access_token}/mapa`}
          icon={<MapIcon className="size-5" />}
          title="Mapa"
          description="Consulta los planos del recinto."
        />
        <NavCard
          href={`/acomodador/${access_token}/recepcion-local`}
          icon={<ClipboardCheckIcon className="size-5" />}
          title="Recepción del local"
          description="Reporta cosas rotas o que falten al recibir el lugar."
        />
        <NavCard
          href={`/acomodador/${access_token}/instrucciones`}
          icon={<BookOpenIcon className="size-5" />}
          title="Instrucciones"
          description="Repasa los procedimientos antes de servir."
        />
      </nav>

      <p className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
        Si pierdes este enlace, escríbele a tu capitán para que te genere uno
        nuevo.
      </p>
    </main>
  )
}

async function loadCapitanAsignado(acomodadorId: string) {
  const admin = createAdminClient()
  const { data: fila } = await admin
    .from("acomodadores")
    .select("capitan_id")
    .eq("id", acomodadorId)
    .maybeSingle()
  if (!fila?.capitan_id) return null
  const { data: capitan } = await admin
    .from("capitanes")
    .select("nombre, apellido, telefono")
    .eq("id", fila.capitan_id)
    .maybeSingle()
  return capitan as {
    nombre: string
    apellido: string
    telefono: string | null
  } | null
}

function NavCard({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-xl border bg-surface p-4 transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground">
        {icon}
      </span>
      <span className="flex flex-col">
        <span className="text-base font-medium text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
    </Link>
  )
}
