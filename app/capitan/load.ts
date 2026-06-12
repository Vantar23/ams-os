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

/**
 * Áreas de la asamblea que pertenecen al capitán. capitanes.area guarda
 * etiquetas "piso — nombre", así que se cruzan contra la tabla areas.
 */
export async function loadAreasDelCapitan(
  asambleaId: string,
  areaLabels: string[],
): Promise<{ id: string; nombre: string }[]> {
  if (areaLabels.length === 0) return []
  const supabase = await createClient()
  const { data: areas } = await supabase
    .from("areas")
    .select("id, piso, nombre")
    .eq("asamblea_id", asambleaId)
  return ((areas ?? []) as { id: string; piso: string; nombre: string }[])
    .filter((a) => areaLabels.includes(`${a.piso} — ${a.nombre}`))
    .map((a) => ({ id: a.id, nombre: a.nombre }))
}
