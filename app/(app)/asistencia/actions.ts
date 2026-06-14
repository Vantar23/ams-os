"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

export async function revertirAsistencia(
  historialId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase.rpc("asistencia_revertir", {
    p_historial_id: historialId,
  })
  if (error) return { ok: false, error: error.message }
  revalidatePath("/asistencia")
  return { ok: true, error: null }
}

// Conteos manuales de administración: se guardan en la base (no en
// localStorage) para que el panel y el enlace público muestren lo mismo.

export async function agregarConteoAdmin(input: {
  asambleaId: string
  areaId: string
  slot: string
  valor: number
}): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { error } = await supabase.from("conteos_admin").insert({
    asamblea_id: input.asambleaId,
    area_id: input.areaId,
    slot: input.slot,
    valor: input.valor,
    reportado_por: user.id,
  })
  if (error) return { ok: false, error: error.message }
  revalidatePath("/asistencia")
  return { ok: true, error: null }
}

export async function editarConteoAdmin(input: {
  id: string
  areaId: string
  slot: string
  valor: number
}): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { error } = await supabase
    .from("conteos_admin")
    .update({
      area_id: input.areaId,
      slot: input.slot,
      valor: input.valor,
      reportado_at: new Date().toISOString(),
    })
    .eq("id", input.id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/asistencia")
  return { ok: true, error: null }
}

export async function eliminarConteoAdmin(
  id: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { error } = await supabase.from("conteos_admin").delete().eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/asistencia")
  return { ok: true, error: null }
}
