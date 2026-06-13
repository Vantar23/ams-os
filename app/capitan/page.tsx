import Link from "next/link"
import { redirect } from "next/navigation"
import {
  AlertOctagonIcon,
  ArmchairIcon,
  CalendarCheckIcon,
  LayoutDashboardIcon,
  MapIcon,
  MapPinIcon,
  MessageCircleIcon,
  UsersIcon,
} from "lucide-react"

import { NavCard } from "@/components/nav-card"
import { TurnoEnCursoCard } from "@/components/turno-en-curso-card"
import {
  DISPONIBILIDAD_SLOTS,
  momentoEnRecinto,
  slotsVisibles,
} from "@/lib/disponibilidad"
import { createClient } from "@/lib/supabase/server"

import {
  loadAreasDelCapitan,
  loadAsientosPorArea,
  loadCapitanActual,
} from "./load"

export default async function Page() {
  const actual = await loadCapitanActual()
  // Un owner (o un capitán sin ficha) no tiene menú simple; lo mandamos al
  // sistema completo en vez de a /resumen para no ciclar con el proxy.
  if (!actual) redirect("/acomodadores")
  const { capitan, asamblea } = actual

  const supabase = await createClient()
  // Su equipo: acomodadores con puesto asignado en sus áreas.
  const areas = await loadAreasDelCapitan(asamblea.id, capitan.area)
  const areaIds = areas.map((a) => a.id)
  const [{ data: asignaciones }, { data: noLeidos }, asientos] =
    await Promise.all([
      areaIds.length
        ? supabase
            .from("asignaciones")
            .select("acomodador_id, slot")
            .eq("asamblea_id", asamblea.id)
            .in("area_id", areaIds)
        : Promise.resolve({ data: [] }),
      supabase.rpc("mensajes_no_leidos_capitan"),
      loadAsientosPorArea(asamblea.id, areas),
    ])
  // Total de asientos disponibles según el conteo oficial de cada área.
  const totalAsientos = asientos.reduce((s, a) => s + (a.disponibles ?? 0), 0)
  const capacidadTotal = asientos.reduce((s, a) => s + a.capacidad, 0)
  const hayReporteAsientos = asientos.some((a) => a.disponibles !== null)
  // Solo cuenta el turno vigente, igual que la lista de Mis acomodadores.
  const slotsVigentes = new Set(
    slotsVisibles(DISPONIBILIDAD_SLOTS, momentoEnRecinto()),
  )
  const totalAcomodadores = new Set(
    (asignaciones ?? [])
      .filter((a) => slotsVigentes.has(a.slot as string))
      .map((a) => a.acomodador_id as string),
  ).size
  const sinLeer = (noLeidos as number | null) ?? 0

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:py-14">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:text-xs sm:tracking-[0.25em]">
        Asamblea N° {asamblea.numero} — {asamblea.edicion}
      </p>
      <h1 className="mt-3 font-serif text-[2rem] leading-[1.1] text-foreground sm:text-4xl sm:leading-tight">
        Hola, {capitan.nombre} {capitan.apellido}
      </h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <p className="inline-flex w-fit items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary">
          Estás asignado como capitán
        </p>
        {capitan.area.map((area) => (
          <span
            key={area}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs text-foreground"
          >
            <MapPinIcon className="size-3.5 text-muted-foreground" />
            {area}
          </span>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <TurnoEnCursoCard className="min-w-0 flex-1" />
        {areas.length > 0 && (
          <div className="inline-flex min-w-0 flex-1 items-center gap-2 rounded-lg border bg-surface px-3 py-1.5">
            <ArmchairIcon className="size-4 shrink-0 text-primary" />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                Asientos disponibles
              </p>
              <p className="text-sm font-medium text-foreground">
                {hayReporteAsientos
                  ? `${totalAsientos}${capacidadTotal ? ` / ${capacidadTotal}` : ""}`
                  : "Sin reporte"}
              </p>
            </div>
          </div>
        )}
      </div>

      <nav className="mt-10 grid gap-3">
        <NavCard
          href="/capitan/pase-de-lista"
          icon={<UsersIcon className="size-5" />}
          title="Mis acomodadores"
          description={
            totalAcomodadores
              ? `Tu equipo (${totalAcomodadores}): contáctalos y marca asistencia o reemplazo.`
              : "Tu equipo: contáctalos y marca asistencia o reemplazo."
          }
        />
        <NavCard
          href="/capitan/asistencia"
          icon={<CalendarCheckIcon className="size-5" />}
          title="Asistencia"
          description="Reporta el conteo de tus áreas por día y sesión."
        />
        <NavCard
          href="/capitan/incidencias"
          icon={<AlertOctagonIcon className="size-5" />}
          title="Incidencias"
          description="Reporta una incidencia durante la asamblea."
        />
        <NavCard
          href="/capitan/mapa"
          icon={<MapIcon className="size-5" />}
          title="Mapa"
          description="Consulta los planos del recinto."
        />
        <NavCard
          href="/capitan/mensajes"
          icon={<MessageCircleIcon className="size-5" />}
          title="Mensajes"
          description="Escríbele al equipo de administración."
          badge={
            sinLeer > 0 ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                {sinLeer}
              </span>
            ) : undefined
          }
        />
      </nav>

      <div className="mt-12 border-t border-border pt-6">
        <Link
          href="/acomodadores"
          className="flex items-center justify-center gap-2 rounded-xl border bg-surface px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <LayoutDashboardIcon className="size-4" />
          Sistema administrativo completo
        </Link>
      </div>
    </main>
  )
}
