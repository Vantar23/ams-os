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
 * token único e irrepetible: así, cada vez que el admin "copia un enlace",
 * obtiene uno distinto que solo servirá en el primer dispositivo que lo abra.
 */
export async function generarPase(input: {
  asambleaId: string
  areaId: string
  nombre?: string
  telefono?: string
}): Promise<{ token: string | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { token: null, error: "No autenticado" }

  const nombre = input.nombre?.trim() || null
  const telefono = input.telefono?.trim() || null

  const token = randomToken()
  const { error } = await supabase.from("accesos_pases").insert({
    asamblea_id: input.asambleaId,
    area_id: input.areaId,
    access_token: token,
    nombre,
    telefono,
  })
  if (error) return { token: null, error: error.message }
  revalidatePath("/accesos")
  return { token, error: null }
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
