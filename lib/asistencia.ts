// Lógica compartida del módulo de asistencia: tipos, constantes de turnos y
// el cálculo de la asistencia vigente por área/sesión. Sin React ni acciones,
// para poder usarla tanto en el panel admin como en la vista pública en vivo.

export type Area = {
  id: string
  piso: string
  nombre: string
  capacidad: number
}

export type Reporte = {
  id: string
  slot: string
  valor: number
  reportadoAt: string
  areaId: string
  areaNombre: string
  areaCapacidad: number
  acomodadorNombre: string
  // "acomodador" es solo referencia (no cuenta); "capitan" es el conteo oficial.
  fuente: "acomodador" | "capitan"
}

export type Sesion = "manana" | "tarde"

export type Modo = "vacios" | "asistentes"

export type Conteo = {
  id: string
  areaId: string
  areaNombre: string
  modo: Modo
  capacidadSnapshot: number
  valor: number
  dia: string
  sesion: Sesion
  timestamp: string
  // "acomodador" es referencia y no cuenta; "capitan" y "manual" (admin) cuentan.
  origen: "manual" | "acomodador" | "capitan"
  reportadoPor?: string
  // legacy field, kept for backward-compat reads
  vacios?: number
}

export type ResumenRow = {
  key: string
  dia: string
  sesion: Sesion
  areaId: string
  areaNombre: string
  modo: Modo
  capacidad: number
  asistencia: number
}

export const SLOT_DIA: Record<string, string> = {
  viernes: "2026-10-02",
  sabado: "2026-10-03",
  domingo: "2026-10-04",
}

export const DIA_A_SLOT: Record<string, string> = Object.fromEntries(
  Object.entries(SLOT_DIA).map(([k, v]) => [v, k]),
)

export const DIAS = [
  { value: "2026-10-02", label: "Vie 2 oct" },
  { value: "2026-10-03", label: "Sáb 3 oct" },
  { value: "2026-10-04", label: "Dom 4 oct" },
] as const

export const SESION_LABEL: Record<Sesion, string> = {
  manana: "Mañana",
  tarde: "Tarde",
}

export const SESIONES: Sesion[] = ["manana", "tarde"]

export function modoDeArea(area: Pick<Area, "capacidad">): Modo {
  return area.capacidad > 0 ? "vacios" : "asistentes"
}

export function asistenciaFromConteo(c: Conteo): number {
  if (c.modo === "asistentes") return Math.max(0, c.valor)
  return Math.max(0, c.capacidadSnapshot - c.valor)
}

export function reporteToConteo(r: Reporte): Conteo | null {
  const [diaKey, sesionKey] = r.slot.split("-") as [string, Sesion]
  const dia = SLOT_DIA[diaKey]
  if (!dia || (sesionKey !== "manana" && sesionKey !== "tarde")) return null
  const modo: Modo = r.areaCapacidad > 0 ? "vacios" : "asistentes"
  return {
    id: `db-${r.id}`,
    areaId: r.areaId,
    areaNombre: r.areaNombre,
    modo,
    capacidadSnapshot: r.areaCapacidad,
    valor: r.valor,
    dia,
    sesion: sesionKey,
    timestamp: r.reportadoAt,
    origen: r.fuente,
    reportadoPor: r.acomodadorNombre,
  }
}

// Asistencia vigente por área+sesión: el conteo más reciente (de capitán o
// admin) gana; los reportes de acomodadores son solo referencia y no cuentan.
export function computeResumenRows(
  areas: Area[],
  conteos: Conteo[],
): ResumenRow[] {
  const byKey = new Map<string, Conteo[]>()
  for (const c of conteos) {
    if (c.origen === "acomodador") continue
    const k = `${c.dia}|${c.sesion}|${c.areaId}`
    const list = byKey.get(k) ?? []
    list.push(c)
    byKey.set(k, list)
  }
  const rows: ResumenRow[] = []
  for (const [key, list] of byKey) {
    list.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
    const head = list[0]
    const liveArea = areas.find((a) => a.id === head.areaId)
    const capacidad = liveArea?.capacidad ?? head.capacidadSnapshot
    const modo: Modo = liveArea ? modoDeArea(liveArea) : head.modo
    const asistencia =
      modo === "asistentes"
        ? Math.max(0, head.valor)
        : Math.max(0, capacidad - head.valor)
    rows.push({
      key,
      dia: head.dia,
      sesion: head.sesion,
      areaId: head.areaId,
      areaNombre: liveArea?.nombre ?? head.areaNombre,
      modo,
      capacidad,
      asistencia,
    })
  }
  rows.sort((a, b) => {
    if (a.dia !== b.dia) return a.dia.localeCompare(b.dia)
    if (a.sesion !== b.sesion) return a.sesion.localeCompare(b.sesion)
    return a.areaNombre.localeCompare(b.areaNombre)
  })
  return rows
}

// Totales por turno (día+sesión): asistencia total y áreas ya contadas.
export function computeResumenPorTurno(
  rows: ResumenRow[],
): Map<string, { asistencia: number; contadas: Set<string> }> {
  const map = new Map<string, { asistencia: number; contadas: Set<string> }>()
  for (const r of rows) {
    const k = `${r.dia}|${r.sesion}`
    const prev = map.get(k) ?? { asistencia: 0, contadas: new Set<string>() }
    prev.asistencia += r.asistencia
    prev.contadas.add(r.areaId)
    map.set(k, prev)
  }
  return map
}

export function formatDia(iso: string | undefined): string {
  if (!iso) return "—"
  const known = DIAS.find((d) => d.value === iso)
  if (known) return known.label
  try {
    return new Date(iso).toLocaleDateString("es-MX", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
  } catch {
    return iso
  }
}

export function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}
