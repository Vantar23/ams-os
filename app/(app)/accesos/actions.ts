"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

/** Token aleatorio de 24 bytes en hex; va en la URL del pase y es el secreto. */
function randomToken(): string {
  const arr = new Uint8Array(24)
  crypto.getRandomValues(arr)
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export async function crearArea(
  asambleaId: string,
  nombre: string,
): Promise<{ error: string | null }> {
  const limpio = nombre.trim()
  if (!limpio) return { error: "Escribe un nombre para el área." }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { error } = await supabase.from("accesos_areas").insert({
    asamblea_id: asambleaId,
    nombre: limpio,
  })
  if (error) return { error: error.message }
  revalidatePath("/accesos")
  return { error: null }
}

export async function eliminarArea(
  areaId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  // Borra el área y, en cascada, todos sus pases.
  const { error } = await supabase
    .from("accesos_areas")
    .delete()
    .eq("id", areaId)
  if (error) return { error: error.message }
  revalidatePath("/accesos")
  return { error: null }
}

/**
 * Acuña un pase NUEVO para un área y devuelve su token. Cada llamada genera un
 * token único e irrepetible. `cupo` es la cantidad de dispositivos que admite el
 * enlace (1 por defecto): los primeros `cupo` dispositivos que lo abran quedan
 * ligados; al llenarse no entra ninguno más y el enlace no se reutiliza.
 */
export async function generarPase(input: {
  asambleaId: string
  areaId: string
  nombre?: string
  telefono?: string
  cupo?: number
}): Promise<{ token: string | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { token: null, error: "No autenticado" }

  const nombre = input.nombre?.trim() || null
  const telefono = input.telefono?.trim() || null
  // Acota el cupo a un rango razonable (coincide con el CHECK de la BD).
  const cupo = Math.min(50, Math.max(1, Math.floor(input.cupo ?? 1)))

  const token = randomToken()
  const { error } = await supabase.from("accesos_pases").insert({
    asamblea_id: input.asambleaId,
    area_id: input.areaId,
    access_token: token,
    nombre,
    telefono,
    cupo,
  })
  if (error) return { token: null, error: error.message }
  revalidatePath("/accesos")
  return { token, error: null }
}

export type PersonaEncontrada = {
  tipo: "Sup/Aux" | "Capitán" | "Acomodador" | "Hermana"
  nombre: string
  telefono: string | null
}

/**
 * Busca personal ya registrado (sub-aux, capitanes, acomodadores, hermanas)
 * por nombre, apellido o teléfono, para rellenar el pase con sus datos.
 */
export async function buscarPersonal(
  asambleaId: string,
  query: string,
): Promise<PersonaEncontrada[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  // Sanitiza: las comas y paréntesis rompen la sintaxis de .or() de PostgREST.
  const safe = q.replace(/[,()*%]/g, " ").trim()
  if (!safe) return []
  const like = `%${safe}%`
  const filtro = `nombre.ilike.${like},apellido.ilike.${like},telefono.ilike.${like}`

  const fuentes: [string, PersonaEncontrada["tipo"]][] = [
    ["sub_aux", "Sup/Aux"],
    ["capitanes", "Capitán"],
    ["acomodadores", "Acomodador"],
    ["hermanas_apoyo", "Hermana"],
  ]

  const listas = await Promise.all(
    fuentes.map(async ([tabla, tipo]) => {
      const { data } = await supabase
        .from(tabla)
        .select("nombre, apellido, telefono")
        .eq("asamblea_id", asambleaId)
        .or(filtro)
        .limit(8)
      return (data ?? []).map((p) => ({
        tipo,
        nombre: `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim(),
        telefono: (p.telefono as string | null) ?? null,
      }))
    }),
  )

  return listas
    .flat()
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
    .slice(0, 20)
}

/** Revoca un pase borrándolo. El enlace deja de funcionar de inmediato. */
export async function eliminarPase(
  paseId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { error } = await supabase
    .from("accesos_pases")
    .delete()
    .eq("id", paseId)
  if (error) return { error: error.message }
  revalidatePath("/accesos")
  return { error: null }
}
