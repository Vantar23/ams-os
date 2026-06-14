import Link from "next/link"
import {
  AlertTriangleIcon,
  ArrowUpRightIcon,
  CalendarCheckIcon,
  ClipboardCheckIcon,
  UsersIcon,
} from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { DISPONIBILIDAD_SLOTS, slotLabelCorto } from "@/lib/disponibilidad"

type Asamblea = {
  id: string
  numero: number | string | null
  edicion: string | null
  titulo: string | null
  fechas: string | null
  sede: string | null
  estado: string | null
  dias_count: number | null
  dias_label: string | null
  sesiones_count: number | null
  sesiones_label: string | null
}

type Area = {
  id: string
  piso: string | null
  nombre: string | null
  acomodadores_necesarios: number | null
  hermanas_necesarias: number | null
  capacidad: number | null
}

type Persona = {
  id: string
  disponibilidad: string[] | null
  device_bound_at?: string | null
}

type Asignacion = {
  area_id: string | null
  slot: string | null
  asistencia: string | null
  lugares_vacios: number | null
}

const conDisponibilidad = (rows: Persona[]) =>
  rows.filter((r) => (r.disponibilidad?.length ?? 0) > 0).length

function barColor(pct: number) {
  if (pct >= 100) return "bg-primary"
  if (pct >= 60) return "bg-amber-500"
  return "bg-destructive"
}

function CoberturaBar({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60">
      <div
        className={`h-full rounded-full ${barColor(pct)}`}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  )
}

export default async function ResumenPage() {
  const supabase = await createClient()

  const { data: asambleas } = await supabase
    .from("asambleas")
    .select(
      "id, numero, edicion, titulo, fechas, sede, estado, dias_count, dias_label, sesiones_count, sesiones_label",
    )
    .order("created_at", { ascending: false })
    .limit(1)

  const asamblea = asambleas?.[0] as Asamblea | undefined

  if (!asamblea) {
    return (
      <>
        <PageHeader parent="Asamblea" title="Resumen" />
        <div className="flex flex-1 items-center justify-center p-10">
          <div className="max-w-md text-center">
            <h2 className="font-serif text-2xl">Aún no tienes una asamblea</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Crea tu primera asamblea para ver el resumen.
            </p>
            <Button asChild className="mt-6">
              <Link href="/register">Crear asamblea</Link>
            </Button>
          </div>
        </div>
      </>
    )
  }

  const [
    { data: capitanes },
    { data: acomodadores },
    { data: hermanas },
    { data: areas },
    { data: asignaciones },
    { data: incidencias },
    { data: desperfectos },
    { data: avisos },
    { data: pases },
  ] = await Promise.all([
    supabase
      .from("capitanes")
      .select("id, disponibilidad")
      .eq("asamblea_id", asamblea.id),
    supabase
      .from("acomodadores")
      .select("id, disponibilidad, device_bound_at")
      .eq("asamblea_id", asamblea.id),
    supabase
      .from("hermanas_apoyo")
      .select("id, disponibilidad, device_bound_at")
      .eq("asamblea_id", asamblea.id),
    supabase
      .from("areas")
      .select(
        "id, piso, nombre, acomodadores_necesarios, hermanas_necesarias, capacidad",
      )
      .eq("asamblea_id", asamblea.id)
      .order("piso", { ascending: true })
      .order("nombre", { ascending: true }),
    supabase
      .from("asignaciones")
      .select("area_id, slot, asistencia, lugares_vacios")
      .eq("asamblea_id", asamblea.id),
    supabase
      .from("incidencias")
      .select("estado")
      .eq("asamblea_id", asamblea.id),
    supabase
      .from("recepcion_local_items")
      .select("estado")
      .eq("asamblea_id", asamblea.id),
    supabase
      .from("avisos")
      .select("id, archivado, expira_at")
      .eq("asamblea_id", asamblea.id),
    supabase
      .from("accesos_pases")
      .select("device_bound_at")
      .eq("asamblea_id", asamblea.id),
  ])

  const capitanesList = (capitanes ?? []) as Persona[]
  const acomodadoresList = (acomodadores ?? []) as Persona[]
  const hermanasList = (hermanas ?? []) as Persona[]
  const areasList = (areas ?? []) as Area[]
  const asignacionesList = (asignaciones ?? []) as Asignacion[]

  const totalPersonal =
    capitanesList.length + acomodadoresList.length + hermanasList.length

  // ── Necesidades por sesión (constante para cada uno de los 6 turnos) ──
  const acomNecesariosPorSlot = areasList.reduce(
    (s, a) => s + (a.acomodadores_necesarios ?? 0),
    0,
  )
  const capacidadTotal = areasList.reduce((s, a) => s + (a.capacidad ?? 0), 0)

  // ── Asignaciones agregadas ──
  const asignadosPorSlot = new Map<string, number>()
  const asignadosPorArea = new Map<string, number>()
  let presentes = 0
  let necesitaRemplazo = 0
  let lugaresVacios = 0
  for (const a of asignacionesList) {
    if (a.slot) asignadosPorSlot.set(a.slot, (asignadosPorSlot.get(a.slot) ?? 0) + 1)
    if (a.area_id)
      asignadosPorArea.set(a.area_id, (asignadosPorArea.get(a.area_id) ?? 0) + 1)
    if (a.asistencia === "presente") presentes += 1
    if (a.asistencia === "necesita_remplazo") necesitaRemplazo += 1
    lugaresVacios += a.lugares_vacios ?? 0
  }

  // Sesiones "activas": las que ya tienen al menos un puesto asignado.
  const slotsActivos = DISPONIBILIDAD_SLOTS.filter(
    (s) => (asignadosPorSlot.get(s) ?? 0) > 0,
  )

  // Disponibilidad declarada por sesión (solo acomodadores).
  const disponiblesPorSlot = new Map<string, number>()
  for (const s of DISPONIBILIDAD_SLOTS) {
    disponiblesPorSlot.set(
      s,
      acomodadoresList.filter((p) => p.disponibilidad?.includes(s)).length,
    )
  }

  // ── Cobertura global de puestos ──
  const necesarioGlobal = acomNecesariosPorSlot * slotsActivos.length
  const asignadoGlobal = slotsActivos.reduce(
    (s, slot) => s + (asignadosPorSlot.get(slot) ?? 0),
    0,
  )
  const coberturaPct =
    necesarioGlobal > 0
      ? Math.round((asignadoGlobal / necesarioGlobal) * 100)
      : null

  // ── Disponibilidad y activación de credenciales ──
  const personalConDisp =
    conDisponibilidad(acomodadoresList) +
    conDisponibilidad(capitanesList) +
    conDisponibilidad(hermanasList)
  const dispPct =
    totalPersonal > 0 ? Math.round((personalConDisp / totalPersonal) * 100) : 0

  const vinculables = acomodadoresList.length + hermanasList.length
  const vinculados =
    acomodadoresList.filter((p) => p.device_bound_at).length +
    hermanasList.filter((p) => p.device_bound_at).length
  const vincPct =
    vinculables > 0 ? Math.round((vinculados / vinculables) * 100) : 0

  // ── Incidencias / desperfectos / avisos ──
  const incidenciasList = (incidencias ?? []) as { estado: string | null }[]
  const incAbiertas = incidenciasList.filter(
    (i) => i.estado === "pendiente" || i.estado === "en_proceso",
  ).length
  const incResueltas = incidenciasList.filter(
    (i) => i.estado === "resuelto",
  ).length

  const desperfectosList = (desperfectos ?? []) as { estado: string | null }[]
  const desperfectosAbiertos = desperfectosList.filter(
    (d) => d.estado === "pendiente" || d.estado === "en_proceso",
  ).length

  const nowMs = Date.now()
  const avisosList = (avisos ?? []) as {
    archivado: boolean | null
    expira_at: string | null
  }[]
  const avisosActivos = avisosList.filter(
    (a) =>
      !a.archivado &&
      (!a.expira_at || new Date(a.expira_at).getTime() > nowMs),
  ).length

  const KPIS = [
    {
      label: "Personal",
      Icon: UsersIcon,
      value: String(totalPersonal),
      hint: `${acomodadoresList.length} acomod. · ${capitanesList.length} capit. · ${hermanasList.length} herm.`,
    },
    {
      label: "Cobertura de puestos",
      Icon: ClipboardCheckIcon,
      value: coberturaPct != null ? `${coberturaPct}%` : "—",
      hint:
        coberturaPct != null
          ? `${asignadoGlobal} de ${necesarioGlobal} en ${slotsActivos.length} sesiones`
          : "Sin asignaciones aún",
    },
    {
      label: "Disponibilidad",
      Icon: CalendarCheckIcon,
      value: `${dispPct}%`,
      hint: `${personalConDisp} de ${totalPersonal} enviaron sus turnos`,
    },
    {
      label: "Incidencias abiertas",
      Icon: AlertTriangleIcon,
      value: String(incAbiertas),
      hint:
        incidenciasList.length === 0
          ? "Sin incidencias"
          : `${incResueltas} resueltas · ${incidenciasList.length} en total`,
    },
  ] as const

  const DEPARTAMENTOS = [
    {
      nombre: "Acomodadores",
      total: acomodadoresList.length,
      completos: conDisponibilidad(acomodadoresList),
      href: "/acomodadores",
    },
    {
      nombre: "Capitanes",
      total: capitanesList.length,
      completos: conDisponibilidad(capitanesList),
      href: "/capitanes",
    },
    {
      nombre: "Hermanas de apoyo",
      total: hermanasList.length,
      completos: conDisponibilidad(hermanasList),
      href: "/hermanas-de-apoyo",
    },
  ] as const

  // Áreas ordenadas por cobertura (las más flojas primero).
  const areasCobertura = areasList
    .map((a) => {
      const necesario = (a.acomodadores_necesarios ?? 0) * slotsActivos.length
      const asignado = asignadosPorArea.get(a.id) ?? 0
      const pct = necesario > 0 ? Math.round((asignado / necesario) * 100) : null
      return { area: a, necesario, asignado, pct }
    })
    .sort((x, y) => {
      const px = x.pct ?? 999
      const py = y.pct ?? 999
      return px - py
    })

  const OPERACION = [
    {
      label: "Asistencia confirmada",
      value:
        asignacionesList.length > 0
          ? `${presentes}/${asignacionesList.length}`
          : "—",
      href: "/asistencia",
    },
    {
      label: "Necesitan remplazo",
      value: String(necesitaRemplazo),
      href: "/remplazos",
    },
    {
      label: "Lugares vacíos reportados",
      value: String(lugaresVacios),
      href: "/asistencia",
    },
    {
      label: "Credenciales activadas",
      value: vinculables > 0 ? `${vinculados}/${vinculables} · ${vincPct}%` : "—",
      href: "/acomodadores",
    },
    {
      label: "Desperfectos abiertos",
      value: String(desperfectosAbiertos),
      href: "/recepcion-local",
    },
    {
      label: "Avisos activos",
      value: String(avisosActivos),
      href: "/avisos",
    },
  ] as const

  return (
    <>
      <PageHeader parent="Asamblea" title="Resumen" />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 lg:px-10">
        <header>
          {asamblea.edicion && (
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {asamblea.edicion}
            </p>
          )}
          <h1 className="mt-2 font-serif text-4xl text-foreground sm:text-5xl">
            {asamblea.titulo ?? "Asamblea"}
          </h1>
          <dl className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {asamblea.fechas && (
              <div className="flex items-baseline gap-2">
                <dt className="text-xs uppercase tracking-[0.15em]">Fechas</dt>
                <dd className="text-foreground">{asamblea.fechas}</dd>
              </div>
            )}
            {asamblea.sede && (
              <div className="flex items-baseline gap-2">
                <dt className="text-xs uppercase tracking-[0.15em]">Sede</dt>
                <dd className="text-foreground">{asamblea.sede}</dd>
              </div>
            )}
            {asamblea.estado && (
              <div className="flex items-baseline gap-2">
                <dt className="text-xs uppercase tracking-[0.15em]">Estado</dt>
                <dd>
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs text-foreground">
                    {asamblea.estado}
                  </span>
                </dd>
              </div>
            )}
          </dl>
        </header>

        <section className="mt-10 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {KPIS.map((k) => (
            <div key={k.label} className="bg-surface p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {k.label}
                </p>
                <k.Icon className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-2 font-serif text-3xl text-foreground">
                {k.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{k.hint}</p>
            </div>
          ))}
        </section>

        {/* ── Cobertura por sesión ── */}
        <section className="mt-12">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Puestos
          </p>
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <h2 className="font-serif text-2xl">Cobertura por sesión</h2>
            <Link
              href="/puestos"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Ver puestos <ArrowUpRightIcon className="size-3.5" />
            </Link>
          </div>
          {acomNecesariosPorSlot === 0 ? (
            <div className="mt-4 rounded-md border border-dashed border-border bg-surface px-5 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Define cuántos acomodadores necesita cada área para ver la
                cobertura por sesión.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link href="/areas">Configurar áreas</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-4 space-y-4 rounded-md border border-border bg-surface px-5 py-5">
              {DISPONIBILIDAD_SLOTS.map((slot) => {
                const asignado = asignadosPorSlot.get(slot) ?? 0
                const disponibles = disponiblesPorSlot.get(slot) ?? 0
                const pct =
                  acomNecesariosPorSlot > 0
                    ? Math.round((asignado / acomNecesariosPorSlot) * 100)
                    : 0
                return (
                  <div key={slot}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-medium text-foreground">
                        {slotLabelCorto(slot)}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        <span className="text-foreground">{asignado}</span>
                        {" / "}
                        {acomNecesariosPorSlot}
                        <span className="ml-2 text-xs">
                          ({disponibles} disp.)
                        </span>
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <CoberturaBar pct={pct} />
                    </div>
                  </div>
                )
              })}
              <p className="border-t border-border pt-3 text-xs text-muted-foreground">
                {acomNecesariosPorSlot} acomodadores por sesión ·{" "}
                {capacidadTotal} asientos · {asignacionesList.length} puestos
                asignados en total
              </p>
            </div>
          )}
        </section>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          {/* ── Cobertura por área ── */}
          <section>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Lugar
            </p>
            <h2 className="mt-2 font-serif text-2xl">Cobertura por área</h2>
            {areasList.length === 0 ? (
              <div className="mt-4 rounded-md border border-dashed border-border bg-surface px-5 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Aún no has registrado áreas.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link href="/areas">Registrar áreas</Link>
                </Button>
              </div>
            ) : (
              <ol className="mt-4 divide-y divide-border rounded-md border border-border bg-surface">
                {areasCobertura.map(({ area, necesario, asignado, pct }) => (
                  <li key={area.id} className="px-5 py-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {area.nombre ?? "Sin nombre"}
                        </p>
                        <p className="mt-0.5 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          {area.piso ?? "—"}
                          {area.capacidad
                            ? ` · ${area.capacidad} asientos`
                            : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-right text-sm tabular-nums">
                        {pct != null ? (
                          <>
                            <span className="text-foreground">{asignado}</span>
                            <span className="text-muted-foreground">
                              {" / "}
                              {necesario}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {area.acomodadores_necesarios ?? 0}/sesión
                          </span>
                        )}
                      </span>
                    </div>
                    {pct != null && (
                      <div className="mt-2">
                        <CoberturaBar pct={pct} />
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* ── Personal + operación ── */}
          <div className="space-y-10">
            <section>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Departamentos
              </p>
              <h2 className="mt-2 font-serif text-2xl">Estado del personal</h2>
              <ul className="mt-4 divide-y divide-border rounded-md border border-border bg-surface">
                {DEPARTAMENTOS.map((d) => {
                  const pct =
                    d.total === 0
                      ? 0
                      : Math.round((d.completos / d.total) * 100)
                  return (
                    <li key={d.nombre}>
                      <Link
                        href={d.href}
                        className="block px-5 py-4 transition-colors hover:bg-background"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-foreground">
                            {d.nombre}
                          </p>
                          <span className="flex items-center gap-1 text-sm tabular-nums text-muted-foreground">
                            {d.total}
                            <ArrowUpRightIcon className="size-3.5" />
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {d.total === 0
                            ? "Sin personal registrado"
                            : `${d.completos} con disponibilidad · ${pct}%`}
                        </p>
                        {d.total > 0 && (
                          <div className="mt-2">
                            <CoberturaBar pct={pct} />
                          </div>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>

            <section>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                En el recinto
              </p>
              <h2 className="mt-2 font-serif text-2xl">Operación</h2>
              <ul className="mt-4 divide-y divide-border rounded-md border border-border bg-surface">
                {OPERACION.map((o) => (
                  <li key={o.label}>
                    <Link
                      href={o.href}
                      className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-background"
                    >
                      <span className="text-sm text-muted-foreground">
                        {o.label}
                      </span>
                      <span className="flex items-center gap-1 text-sm font-medium tabular-nums text-foreground">
                        {o.value}
                        <ArrowUpRightIcon className="size-3.5 text-muted-foreground" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        <section className="mt-12 border-t border-border pt-8">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Notas
          </p>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            La cobertura por sesión compara los puestos asignados con los
            acomodadores que cada área necesita; las sesiones sin asignaciones
            aún no se cuentan en el total. Abre cada sección del menú lateral
            para ver el detalle por persona o por área.
          </p>
        </section>
      </div>
    </>
  )
}
