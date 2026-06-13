import { asientosDeReporte } from "@/lib/asientos"
import { createClient } from "@/lib/supabase/server"

export type CapitanActual = {
  capitan: {
    id: string
    nombre: string
    apellido: string
    area: string[]
  }
  asamblea: {
    id: string
    numero: string
    edicion: string
  }
}

/**
 * Resuelve el capitán de la sesión actual en la asamblea más reciente.
 * Devuelve null si el usuario no es capitán (p. ej. un owner que navega a
 * /capitan a mano).
 */
export async function loadCapitanActual(): Promise<CapitanActual | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: asambleas } = await supabase
    .from("asambleas")
    .select("id, numero, edicion")
    .order("created_at", { ascending: false })
    .limit(1)
  const asamblea = asambleas?.[0]
  if (!asamblea) return null

  const { data: capitan } = await supabase
    .from("capitanes")
    .select("id, nombre, apellido, area")
    .eq("asamblea_id", asamblea.id)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!capitan) return null

  return {
    capitan: {
      ...capitan,
      area: (capitan.area as string[] | null) ?? [],
    },
    asamblea,
  } as CapitanActual
}

export type AreaDelCapitan = {
  id: string
  nombre: string
  piso: string
  capacidad: number
  filas: number
}

/**
 * Áreas de la asamblea que pertenecen al capitán. capitanes.area guarda
 * etiquetas "piso — nombre", así que se cruzan contra la tabla areas.
 */
export async function loadAreasDelCapitan(
  asambleaId: string,
  areaLabels: string[],
): Promise<AreaDelCapitan[]> {
  if (areaLabels.length === 0) return []
  const supabase = await createClient()
  const { data: areas } = await supabase
    .from("areas")
    .select("id, piso, nombre, capacidad, filas")
    .eq("asamblea_id", asambleaId)
  return ((areas ?? []) as AreaDelCapitan[]).filter((a) =>
    areaLabels.includes(`${a.piso} — ${a.nombre}`),
  )
}

export type AsientosArea = {
  areaId: string
  piso: string
  nombre: string
  capacidad: number
  // null = área sin capacidad fija o sin reporte todavía.
  disponibles: number | null
  asistencia: number | null
  slot: string | null
  reportadoAt: string | null
}

/**
 * Asientos disponibles por área del capitán, según su conteo oficial más
 * reciente (conteos_capitan.valor). Solo cuenta el conteo del capitán: los
 * reportes de acomodadores son insumo de validación, no el número oficial.
 * Devuelve una fila por área asignada, ordenadas por piso y nombre.
 */
export async function loadAsientosPorArea(
  asambleaId: string,
  areas: AreaDelCapitan[],
): Promise<AsientosArea[]> {
  if (areas.length === 0) return []
  const supabase = await createClient()
  const areaIds = areas.map((a) => a.id)

  // Conteo oficial más reciente por área (el mayor reportado_at).
  const ultimoPorArea = new Map<
    string,
    { valor: number; slot: string; reportadoAt: string }
  >()
  const considerar = (
    areaId: string,
    valor: number,
    slot: string,
    reportadoAt: string,
  ) => {
    const prev = ultimoPorArea.get(areaId)
    if (!prev || prev.reportadoAt < reportadoAt) {
      ultimoPorArea.set(areaId, { valor, slot, reportadoAt })
    }
  }

  const { data: conteos } = await supabase
    .from("conteos_capitan")
    .select("area_id, slot, valor, reportado_at")
    .eq("asamblea_id", asambleaId)
    .in("area_id", areaIds)
    .order("reportado_at", { ascending: false })

  for (const c of (conteos ?? []) as {
    area_id: string
    slot: string
    valor: number
    reportado_at: string
  }[]) {
    considerar(c.area_id, c.valor, c.slot, c.reportado_at)
  }

  return areas
    .map((a) => {
      const ultimo = ultimoPorArea.get(a.id) ?? null
      const { disponibles, asistencia } = asientosDeReporte(
        a.capacidad,
        ultimo?.valor ?? null,
      )
      return {
        areaId: a.id,
        piso: a.piso,
        nombre: a.nombre,
        capacidad: a.capacidad,
        disponibles,
        asistencia,
        slot: ultimo?.slot ?? null,
        reportadoAt: ultimo?.reportadoAt ?? null,
      }
    })
    .sort(
      (x, y) =>
        x.piso.localeCompare(y.piso) || x.nombre.localeCompare(y.nombre),
    )
}

export type ReporteAcomodador = {
  acomodadorNombre: string
  // Valor crudo que reportó el acomodador (lugares vacíos si el área tiene
  // capacidad fija, o asistentes contados si no la tiene).
  valor: number
  asistencia: number | null
  reportadoAt: string
}

/**
 * Reportes de asistencia de los acomodadores en las áreas del capitán, para que
 * el capitán vea quién anotó qué antes de emitir su conteo oficial. Indexado por
 * area_id y luego por slot. Cada lista va de más reciente a más antigua.
 */
export async function loadReportesAcomodadoresPorArea(
  asambleaId: string,
  areas: AreaDelCapitan[],
): Promise<Record<string, Record<string, ReporteAcomodador[]>>> {
  if (areas.length === 0) return {}
  const supabase = await createClient()
  const capacidadPorArea = new Map(areas.map((a) => [a.id, a.capacidad]))

  const { data } = await supabase
    .from("asignaciones")
    .select(
      "area_id, slot, lugares_vacios, reportado_at, acomodadores(nombre, apellido)",
    )
    .eq("asamblea_id", asambleaId)
    .in(
      "area_id",
      areas.map((a) => a.id),
    )
    .not("lugares_vacios", "is", null)
    .order("reportado_at", { ascending: false })

  type Row = {
    area_id: string
    slot: string
    lugares_vacios: number
    reportado_at: string
    acomodadores:
      | { nombre: string; apellido: string }
      | { nombre: string; apellido: string }[]
      | null
  }
  const first = <T,>(v: T | T[] | null | undefined): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : (v ?? null)

  const out: Record<string, Record<string, ReporteAcomodador[]>> = {}
  for (const r of (data ?? []) as unknown as Row[]) {
    const ac = first(r.acomodadores)
    const { asistencia } = asientosDeReporte(
      capacidadPorArea.get(r.area_id) ?? 0,
      r.lugares_vacios,
    )
    const porSlot = (out[r.area_id] ??= {})
    ;(porSlot[r.slot] ??= []).push({
      acomodadorNombre: ac ? `${ac.nombre} ${ac.apellido}`.trim() : "—",
      valor: r.lugares_vacios,
      asistencia,
      reportadoAt: r.reportado_at,
    })
  }
  return out
}
