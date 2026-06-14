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
import { PersonalMensajesBadge } from "@/components/personal-mensajes-badge"
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
  const todas = await loadAsignacionesHermana(access_token)
  const visibles = slotsVisibles(
    todas.map((p) => p.slot),
    momentoEnRecinto(),
  )
  const puestos = todas.filter((p) => visibles.includes(p.slot))
  // El capitán que ve la hermana es el del área a la que está asignada (no un
  // capitán fijo). Tomamos las áreas de sus puestos vigentes; si no hay ninguno
  // vigente, todas sus áreas asignadas para que siempre tenga a quién acudir.
  const areasParaCapitan = puestos.length > 0 ? puestos : todas
  const etiquetasArea = [
    ...new Set(areasParaCapitan.map((p) => `${p.area_piso} — ${p.area_nombre}`)),
  ]
  const capitanes = await loadCapitanesDeAreas(
    hermana.asamblea_id,
    etiquetasArea,
  )

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

      {capitanes.map((capitan) => (
        <CapitanCard
          key={capitan.id}
          nombre={capitan.nombre}
          apellido={capitan.apellido}
          telefono={capitan.telefono}
        />
      ))}

      <nav className="mt-10 grid gap-3">
        <NavCard
          href={`/hermana-apoyo/${access_token}/mensajes`}
          icon={<MessageCircleIcon className="size-5" />}
          title="Mensajes"
          description="Escríbele al equipo de administración."
          badge={
            <PersonalMensajesBadge tipo="hermana" accessToken={access_token} />
          }
        />
        <NavCard
          href={`/hermana-apoyo/${access_token}/asistencia`}
          icon={<CalendarCheckIcon className="size-5" />}
          title="Asistencia"
          description="Consulta tus puestos asignados por sesión."
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

/**
 * Capitanes de las áreas dadas (etiquetas "piso — nombre"), para que la hermana
 * vea al capitán del área a la que está asignada y no a un capitán fijo. Un
 * capitán puede cubrir varias de sus áreas: se devuelve sin repetir. Usa el
 * cliente admin porque el portal es por token (sin sesión).
 */
async function loadCapitanesDeAreas(
  asambleaId: string,
  etiquetasArea: string[],
) {
  if (etiquetasArea.length === 0) return []
  const admin = createAdminClient()
  const { data } = await admin
    .from("capitanes")
    .select("id, nombre, apellido, telefono, area")
    .eq("asamblea_id", asambleaId)
    .overlaps("area", etiquetasArea)
  const capitanes = (data ?? []) as {
    id: string
    nombre: string
    apellido: string
    telefono: string | null
    area: string[]
  }[]
  return capitanes.map(({ id, nombre, apellido, telefono }) => ({
    id,
    nombre,
    apellido,
    telefono,
  }))
}
