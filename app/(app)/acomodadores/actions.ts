"use server"

import { randomBytes } from "crypto"
import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

const ENLACE_REGISTRO_TTL_MS = 3 * 24 * 60 * 60 * 1000 // 3 días

export async function crearEnlaceRegistro(
  asambleaId: string,
): Promise<{ token: string | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { token: null, error: "No autenticado" }

  const token = randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + ENLACE_REGISTRO_TTL_MS).toISOString()

  const { error } = await supabase.from("enlaces_registro").insert({
    token,
    asamblea_id: asambleaId,
    created_by: user.id,
    expires_at: expiresAt,
  })

  if (error) return { token: null, error: error.message }
  revalidatePath("/acomodadores")
  return { token, error: null }
}

export async function regenerarAcceso(
  asambleaId: string,
  telefono: string,
): Promise<{ token: string | null; error: string | null }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("acceso_regenerar", {
    p_asamblea_id: asambleaId,
    p_telefono: telefono,
  })
  if (error) return { token: null, error: error.message }
  revalidatePath("/acomodadores")
  return { token: data as string, error: null }
}

export async function agregarAcomodadorManual(
  asambleaId: string,
  values: {
    nombre: string
    apellido: string
    congregacion: string
    telefono: string
    notas: string
  },
): Promise<{ accessToken: string | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { accessToken: null, error: "No autenticado" }

  const accessToken = randomBytes(32).toString("hex")

  const { error } = await supabase.from("acomodadores").insert({
    asamblea_id: asambleaId,
    nombre: values.nombre,
    apellido: values.apellido,
    congregacion: values.congregacion,
    telefono: values.telefono,
    notas: values.notas || null,
    invited_by: user.id,
    access_token: accessToken,
  })

  if (error) {
    // 23505 = unique_violation
    if (error.code === "23505") {
      return {
        accessToken: null,
        error: "Este teléfono ya está registrado en esta asamblea.",
      }
    }
    return { accessToken: null, error: error.message }
  }

  revalidatePath("/acomodadores")
  return { accessToken, error: null }
}
