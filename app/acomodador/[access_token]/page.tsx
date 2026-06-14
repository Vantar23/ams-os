import {
  AlertOctagonIcon,
  BookOpenIcon,
  CalendarCheckIcon,
  ClipboardCheckIcon,
  HeartIcon,
  MapIcon,
  MapPinIcon,
  MessageCircleIcon,
} from "lucide-react"

import { CapitanCard } from "@/components/capitan-card"
import { NavCard } from "@/components/nav-card"
import { PersonalMensajesBadge } from "@/components/personal-mensajes-badge"
import { RememberPersonal } from "@/components/remember-personal"
import { TurnoEnCursoCard } from "@/components/turno-en-curso-card"
import {
  momentoEnRecinto,
  slotLabelCorto,
  slotsVisibles,
} from "@/lib/disponibilidad"
import { createAdminClient } from "@/lib/supabase/admin"

import { BlockedView } from "./blocked-view"
import { ClaimView } from "./claim-view"
import { loadAcomodadorByToken, loadAsignaciones } from "./load"
import { LogoutLink } from "./logout-link"

export default async function Page({
  params,
}: {
  params: Promise<{ access_token: string }>
}) {
  const { access_token } = await params
  const result = await loadAcomodadorByToken(access_token)

  if (result.kind === "blocked") {
    return (
      <BlockedView
        reason={result.reason}
        message={result.message}
        accessToken={access_token}
        asambleaId={result.asambleaId}
      />
    )
  }
  if (result.kind === "claim") {
    return (
      <ClaimView
        accessToken={access_token}
        nombre={result.nombre}
        asamblea={result.asamblea}
        asambleaId={result.asambleaId}
      />
    )
  }

  const { acomodador } = result
  const avisoReemplazo = await loadAvisoReemplazo(
    acomodador.id,
    acomodador.asamblea_id,
  )
  const asignaciones = await loadAsignaciones(access_token)
  const visibles = slotsVisibles(
    asignaciones.map((a) => a.slot),
    momentoEnRecinto(),
  )
  const puestos = asignaciones.filter((a) => visibles.includes(a.slot))
  // El capitán que ve el acomodador es el del área a la que está asignado (no
  // un capitán fijo). Tomamos las áreas de sus puestos vigentes; si no hay
  // ninguno vigente, todas sus áreas asignadas para que siempre tenga a quién
  // acudir.
  const areasParaCapitan = puestos.length > 0 ? puestos : asignaciones
  const etiquetasArea = [
    ...new Set(areasParaCapitan.map((a) => `${a.area_piso} — ${a.area_nombre}`)),
  ]
  const capitanes = await loadCapitanesDeAreas(
    acomodador.asamblea_id,
    etiquetasArea,
  )

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

      <div className="mt-4">
        <TurnoEnCursoCard />
      </div>

      {avisoReemplazo && (
        <div className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300">
            <HeartIcon className="size-4 shrink-0" />
            Gracias por tu servicio
          </p>
          <p className="mt-1.5 text-sm text-foreground">
            Notamos que no pudiste estar en tu puesto
            {avisoReemplazo.areaNombre ? ` de ${avisoReemplazo.areaNombre}` : ""}{" "}
            ({slotLabelCorto(avisoReemplazo.slot)}), así que otro hermano lo
            cubrió para no dejar el área sola. ¡No te preocupes! Agradecemos de
            corazón tu disposición y nos encantará contar contigo en tu próximo
            turno. 🤍
          </p>
        </div>
      )}

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
          href={`/acomodador/${access_token}/mensajes`}
          icon={<MessageCircleIcon className="size-5" />}
          title="Mensajes"
          description="Escríbele al equipo de administración."
          badge={
            <PersonalMensajesBadge
              tipo="acomodador"
              accessToken={access_token}
            />
          }
        />
        <NavCard
          href={`/acomodador/${access_token}/asistencia`}
          icon={<CalendarCheckIcon className="size-5" />}
          title="Asistencia"
          description="Captura las asistencias del recinto en tu área asignada."
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

      <div className="mt-12 border-t border-border pt-6 text-center">
        <p className="text-xs text-muted-foreground">
          Si pierdes este enlace, escríbele a tu capitán para que te genere uno
          nuevo.
        </p>
        <div className="mt-4">
          <LogoutLink asambleaId={acomodador.asamblea_id} />
        </div>
      </div>
    </main>
  )
}

/**
 * Capitanes de las áreas dadas (etiquetas "piso — nombre"), para que el
 * acomodador vea al capitán del área a la que está asignado y no a un capitán
 * fijo. Un capitán puede cubrir varias de sus áreas: se devuelve sin repetir.
 * Usa el cliente admin porque el portal es por token (sin sesión).
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

/**
 * Si al acomodador lo reemplazaron en algún puesto de esta asamblea, devuelve el
 * más reciente para mostrarle un aviso cordial en su inicio. Usa el cliente
 * admin porque el portal es por token (sin sesión), y reemplazos tiene RLS de
 * miembros.
 */
async function loadAvisoReemplazo(acomodadorId: string, asambleaId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from("reemplazos")
    .select("slot, area_id, created_at")
    .eq("asamblea_id", asambleaId)
    .eq("saliente_id", acomodadorId)
    .order("created_at", { ascending: false })
    .limit(1)
  const reemplazo = data?.[0] as
    | { slot: string; area_id: string; created_at: string }
    | undefined
  if (!reemplazo) return null
  const { data: area } = await admin
    .from("areas")
    .select("nombre")
    .eq("id", reemplazo.area_id)
    .maybeSingle()
  return {
    slot: reemplazo.slot,
    areaNombre: (area?.nombre as string | undefined) ?? null,
  }
}
