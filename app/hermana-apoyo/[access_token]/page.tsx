import {
  AlertOctagonIcon,
  BookOpenIcon,
  CalendarCheckIcon,
  ClipboardCheckIcon,
  MapIcon,
  MapPinIcon,
  MessageCircleIcon,
} from "lucide-react"

import { CapitanCard } from "@/components/capitan-card"
import { NavCard } from "@/components/nav-card"
import { RememberPersonal } from "@/components/remember-personal"
import {
  momentoEnRecinto,
  slotLabelCorto,
  slotsVisibles,
} from "@/lib/disponibilidad"
import { createAdminClient } from "@/lib/supabase/admin"

import { BlockedView } from "./blocked-view"
import { ClaimView } from "./claim-view"
import { loadAsignacionesHermana, loadHermanaByToken } from "./load"

export default async function Page({
  params,
}: {
  params: Promise<{ access_token: string }>
}) {
  const { access_token } = await params
  const result = await loadHermanaByToken(access_token)

  if (result.kind === "blocked") {
    return (
      <BlockedView
        reason={result.reason}
        message={result.message}
        accessToken={access_token}
      />
    )
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

  const { hermana } = result
  const capitan = await loadCapitanAsignado(hermana.id)
  const todas = await loadAsignacionesHermana(access_token)
  const visibles = slotsVisibles(
    todas.map((p) => p.slot),
    momentoEnRecinto(),
  )
  const puestos = todas.filter((p) => visibles.includes(p.slot))

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:py-14">
      <RememberPersonal
        tipo="hermana"
        id={hermana.id}
        asambleaId={hermana.asamblea_id}
        nombre={hermana.nombre}
        apellido={hermana.apellido}
      />
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:text-xs sm:tracking-[0.25em]">
        Asamblea N° {hermana.asamblea_numero} — {hermana.asamblea_edicion}
      </p>
      <h1 className="mt-3 font-serif text-[2rem] leading-[1.1] text-foreground sm:text-4xl sm:leading-tight">
        Hola, {hermana.nombre} {hermana.apellido}
      </h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <p className="inline-flex w-fit items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary">
          Estás asignada como hermana de apoyo
        </p>
        {puestos.map((p) => (
          <span
            key={p.asignacion_id}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs text-foreground"
          >
            <MapPinIcon className="size-3.5 text-muted-foreground" />
            {p.area_nombre} · {slotLabelCorto(p.slot)}
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
          href={`/hermana-apoyo/${access_token}/asistencia`}
          icon={<CalendarCheckIcon className="size-5" />}
          title="Asistencia"
          description="Consulta tus puestos asignados por sesión."
        />
        <NavCard
          href={`/hermana-apoyo/${access_token}/mensajes`}
          icon={<MessageCircleIcon className="size-5" />}
          title="Mensajes"
          description="Escríbele al equipo de administración."
        />
        <NavCard
          href={`/hermana-apoyo/${access_token}/incidencias`}
          icon={<AlertOctagonIcon className="size-5" />}
          title="Incidencias"
          description="Reporta una incidencia durante la asamblea."
        />
        <NavCard
          href={`/hermana-apoyo/${access_token}/mapa`}
          icon={<MapIcon className="size-5" />}
          title="Mapa"
          description="Consulta los planos del recinto."
        />
        <NavCard
          href={`/hermana-apoyo/${access_token}/recepcion-local`}
          icon={<ClipboardCheckIcon className="size-5" />}
          title="Recepción del local"
          description="Reporta cosas rotas o que falten al recibir el lugar."
        />
        <NavCard
          href={`/hermana-apoyo/${access_token}/instrucciones`}
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

async function loadCapitanAsignado(hermanaId: string) {
  const admin = createAdminClient()
  const { data: fila } = await admin
    .from("hermanas_apoyo")
    .select("capitan_id")
    .eq("id", hermanaId)
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
