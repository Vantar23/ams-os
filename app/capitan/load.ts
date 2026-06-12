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
 * Asientos disponibles por área del capitán, según el reporte más reciente de
 * cada área —sea de un acomodador (asignaciones.lugares_vacios) o del propio
 * capitán (conteos_capitan.valor)—. Devuelve una fila por área asignada,
 * ordenadas por piso y nombre.
 */
export async function loadAsientosPorArea(
  asambleaId: string,
  areas: AreaDelCapitan[],
): Promise<AsientosArea[]> {
  if (areas.length === 0) return []
  const supabase = await createClient()
  const areaIds = areas.map((a) => a.id)

  // Reporte más reciente por área: el mayor reportado_at entre los lugares
  // vacíos de acomodadores y los conteos del capitán.
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

  const [{ data: asigns }, { data: conteos }] = await Promise.all([
    supabase
      .from("asignaciones")
      .select("area_id, slot, lugares_vacios, reportado_at")
      .eq("asamblea_id", asambleaId)
      .in("area_id", areaIds)
      .not("lugares_vacios", "is", null)
      .order("reportado_at", { ascending: false }),
    supabase
      .from("conteos_capitan")
      .select("area_id, slot, valor, reportado_at")
      .eq("asamblea_id", asambleaId)
      .in("area_id", areaIds)
      .order("reportado_at", { ascending: false }),
  ])

  for (const r of (asigns ?? []) as {
    area_id: string
    slot: string
    lugares_vacios: number
    reportado_at: string
  }[]) {
    considerar(r.area_id, r.lugares_vacios, r.slot, r.reportado_at)
  }
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
