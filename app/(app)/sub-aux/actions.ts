"use server"

import { randomBytes } from "crypto"
import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

const ENLACE_REGISTRO_TTL_MS = 3 * 24 * 60 * 60 * 1000 // 3 días

export type SubAuxRole = "subcapitan" | "auxiliar"

type SubAuxInput = {
  role: SubAuxRole
  nombre: string
  apellido: string
  congregacion: string
  telefono: string
  area: string[]
  notas: string
  disponibilidad: string[]
}

export async function agregarSubAux(
  asambleaId: string,
  values: SubAuxInput,
): Promise<{ id: string | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { id: null, error: "No autenticado" }

  const { data, error } = await supabase
    .from("sub_aux")
    .insert({
      asamblea_id: asambleaId,
      role: values.role,
      nombre: values.nombre,
      apellido: values.apellido,
      congregacion: values.congregacion,
      telefono: values.telefono,
      area: values.area,
      notas: values.notas || null,
      invited_by: user.id,
      disponibilidad: values.disponibilidad,
    })
    .select("id")
    .single()

  if (error) {
    if (error.code === "23505") {
      return {
        id: null,
        error: "Este teléfono ya está registrado en esta asamblea.",
      }
    }
    return { id: null, error: error.message }
  }

  revalidatePath("/sub-aux")
  return { id: data.id, error: null }
}

export async function actualizarSubAux(
  id: string,
  values: SubAuxInput,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { error } = await supabase
    .from("sub_aux")
    .update({
      role: values.role,
      nombre: values.nombre,
      apellido: values.apellido,
      congregacion: values.congregacion,
      telefono: values.telefono,
      area: values.area,
      notas: values.notas || null,
      disponibilidad: values.disponibilidad,
    })
    .eq("id", id)

  if (error) {
    if (error.code === "23505") {
      return { error: "Este teléfono ya está registrado en esta asamblea." }
    }
    return { error: error.message }
  }

  revalidatePath("/sub-aux")
  return { error: null }
}

export async function crearEnlaceRegistroSubAux(
  asambleaId: string,
  role: SubAuxRole,
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
    target_role: role,
  })

  if (error) return { token: null, error: error.message }
  revalidatePath("/sub-aux")
  return { token, error: null }
}

export async function generarAccesoSubAux(
  id: string,
): Promise<{ token: string | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { token: null, error: "No autenticado" }

  const { data: persona, error: fetchErr } = await supabase
    .from("sub_aux")
    .select("id, asamblea_id")
    .eq("id", id)
    .single()
  if (fetchErr || !persona) {
    return { token: null, error: fetchErr?.message ?? "Registro no encontrado" }
  }

  const token = randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + ENLACE_REGISTRO_TTL_MS).toISOString()

  const { error } = await supabase.from("enlaces_registro").insert({
    token,
    asamblea_id: persona.asamblea_id,
    created_by: user.id,
    expires_at: expiresAt,
    target_role: "sub_aux_reset",
    sub_aux_id: persona.id,
  })

  if (error) return { token: null, error: error.message }
  return { token, error: null }
}

export async function eliminarSubAux(
  id: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { error } = await supabase.from("sub_aux").delete().eq("id", id)

  if (error) return { error: error.message }
  revalidatePath("/sub-aux")
  return { error: null }
}
