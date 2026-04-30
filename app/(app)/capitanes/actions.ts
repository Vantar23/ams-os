"use server"

import { randomBytes } from "crypto"
import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

import type { AreaCapitan } from "./areas"

const ENLACE_REGISTRO_TTL_MS = 3 * 24 * 60 * 60 * 1000 // 3 días

type CapitanInput = {
  nombre: string
  apellido: string
  congregacion: string
  telefono: string
  area: AreaCapitan
  notas: string
  disponibilidad: string[]
}

export async function agregarCapitan(
  asambleaId: string,
  values: CapitanInput,
): Promise<{ id: string | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { id: null, error: "No autenticado" }

  const { data, error } = await supabase
    .from("capitanes")
    .insert({
      asamblea_id: asambleaId,
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

  revalidatePath("/capitanes")
  revalidatePath("/acomodadores")
  return { id: data.id, error: null }
}

export async function actualizarCapitan(
  capitanId: string,
  values: CapitanInput,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { error } = await supabase
    .from("capitanes")
    .update({
      nombre: values.nombre,
      apellido: values.apellido,
      congregacion: values.congregacion,
      telefono: values.telefono,
      area: values.area,
      notas: values.notas || null,
      disponibilidad: values.disponibilidad,
    })
    .eq("id", capitanId)

  if (error) {
    if (error.code === "23505") {
      return { error: "Este teléfono ya está registrado en esta asamblea." }
    }
    return { error: error.message }
  }

  revalidatePath("/capitanes")
  revalidatePath("/acomodadores")
  return { error: null }
}

export async function crearEnlaceRegistroCapitan(
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
    target_role: "capitan",
  })

  if (error) return { token: null, error: error.message }
  revalidatePath("/capitanes")
  return { token, error: null }
}

export async function generarAccesoCapitan(
  capitanId: string,
): Promise<{ token: string | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { token: null, error: "No autenticado" }

  const { data: capitan, error: fetchErr } = await supabase
    .from("capitanes")
    .select("id, asamblea_id")
    .eq("id", capitanId)
    .single()
  if (fetchErr || !capitan) {
    return { token: null, error: fetchErr?.message ?? "Capitán no encontrado" }
  }

  const token = randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + ENLACE_REGISTRO_TTL_MS).toISOString()

  const { error } = await supabase.from("enlaces_registro").insert({
    token,
    asamblea_id: capitan.asamblea_id,
    created_by: user.id,
    expires_at: expiresAt,
    target_role: "capitan_reset",
    capitan_id: capitan.id,
  })

  if (error) return { token: null, error: error.message }
  return { token, error: null }
}

export async function eliminarCapitan(
  capitanId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { error } = await supabase
    .from("capitanes")
    .delete()
    .eq("id", capitanId)

  if (error) return { error: error.message }
  revalidatePath("/capitanes")
  revalidatePath("/acomodadores")
  return { error: null }
}
