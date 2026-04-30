"use server"

import { randomBytes } from "crypto"
import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

const ENLACE_REGISTRO_TTL_MS = 3 * 24 * 60 * 60 * 1000 // 3 días

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

async function lookupCapitanIdForUser(
  supabase: SupabaseServer,
  asambleaId: string,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("capitanes")
    .select("id")
    .eq("asamblea_id", asambleaId)
    .eq("user_id", userId)
    .maybeSingle()
  return data?.id ?? null
}

export async function crearEnlaceRegistroHermana(
  asambleaId: string,
): Promise<{ token: string | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { token: null, error: "No autenticado" }

  const token = randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + ENLACE_REGISTRO_TTL_MS).toISOString()
  const capitanId = await lookupCapitanIdForUser(supabase, asambleaId, user.id)

  const { error } = await supabase.from("enlaces_registro").insert({
    token,
    asamblea_id: asambleaId,
    created_by: user.id,
    expires_at: expiresAt,
    target_role: "hermana_apoyo",
    capitan_id: capitanId,
  })

  if (error) return { token: null, error: error.message }
  revalidatePath("/hermanas-de-apoyo")
  return { token, error: null }
}

export async function regenerarAccesoHermana(
  asambleaId: string,
  telefono: string,
): Promise<{ token: string | null; error: string | null }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("hermana_acceso_regenerar", {
    p_asamblea_id: asambleaId,
    p_telefono: telefono,
  })
  if (error) return { token: null, error: error.message }
  revalidatePath("/hermanas-de-apoyo")
  return { token: data as string, error: null }
}

export async function actualizarHermana(
  hermanaId: string,
  values: {
    nombre: string
    apellido: string
    congregacion: string
    telefono: string
    notas: string
    capitanId: string | null
    disponibilidad: string[]
  },
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { error } = await supabase
    .from("hermanas_apoyo")
    .update({
      nombre: values.nombre,
      apellido: values.apellido,
      congregacion: values.congregacion,
      telefono: values.telefono,
      notas: values.notas || null,
      capitan_id: values.capitanId,
      disponibilidad: values.disponibilidad,
    })
    .eq("id", hermanaId)

  if (error) {
    if (error.code === "23505") {
      return { error: "Este teléfono ya está registrado en esta asamblea." }
    }
    return { error: error.message }
  }
  revalidatePath("/hermanas-de-apoyo")
  return { error: null }
}

export async function eliminarHermana(
  hermanaId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { error } = await supabase
    .from("hermanas_apoyo")
    .delete()
    .eq("id", hermanaId)

  if (error) return { error: error.message }
  revalidatePath("/hermanas-de-apoyo")
  return { error: null }
}

export async function agregarHermanaManual(
  asambleaId: string,
  values: {
    nombre: string
    apellido: string
    congregacion: string
    telefono: string
    notas: string
    capitanId: string | null
    disponibilidad: string[]
  },
): Promise<{ accessToken: string | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { accessToken: null, error: "No autenticado" }

  const accessToken = randomBytes(32).toString("hex")

  const { error } = await supabase.from("hermanas_apoyo").insert({
    asamblea_id: asambleaId,
    nombre: values.nombre,
    apellido: values.apellido,
    congregacion: values.congregacion,
    telefono: values.telefono,
    notas: values.notas || null,
    invited_by: user.id,
    access_token: accessToken,
    capitan_id: values.capitanId,
    disponibilidad: values.disponibilidad,
  })

  if (error) {
    if (error.code === "23505") {
      return {
        accessToken: null,
        error: "Este teléfono ya está registrado en esta asamblea.",
      }
    }
    return { accessToken: null, error: error.message }
  }

  revalidatePath("/hermanas-de-apoyo")
  return { accessToken, error: null }
}
